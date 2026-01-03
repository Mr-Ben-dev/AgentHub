#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use agent_hub::{
    AgentHubAbi, AgentHubError, AgentHubResponse, AgentStrategy, Direction, Follower, 
    FollowerKey, InstantiationArgument, Message, Operation, Signal, SignalResult, 
    SignalStatus, StrategyStats,
};
use linera_sdk::{
    linera_base_types::{AccountOwner, ChainId, WithContractAbi},
    views::{RootView, View},
    Contract, ContractRuntime,
};

use self::state::AgentHubState;

/// The AgentHub contract.
pub struct AgentHubContract {
    state: AgentHubState,
    runtime: ContractRuntime<Self>,
}

linera_sdk::contract!(AgentHubContract);

impl WithContractAbi for AgentHubContract {
    type Abi = AgentHubAbi;
}

impl Contract for AgentHubContract {
    type Message = Message;
    type Parameters = ();
    type InstantiationArgument = InstantiationArgument;
    type EventValue = ();

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = AgentHubState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        AgentHubContract { state, runtime }
    }

    async fn instantiate(&mut self, argument: InstantiationArgument) {
        // Parse and store hub chain ID
        if let Ok(chain_id) = argument.hub_chain_id.parse::<ChainId>() {
            self.state.hub_chain_id.set(Some(chain_id));
        }
        // Initialize counters
        self.state.next_strategy_id.set(1);
        self.state.next_signal_id.set(1);
    }

    async fn execute_operation(&mut self, operation: Operation) -> AgentHubResponse {
        // Get authenticated signer
        let owner = match self.runtime.authenticated_signer() {
            Some(signer) => AccountOwner::from(signer),
            None => return AgentHubResponse::Error { message: "Not authenticated".to_string() },
        };

        match operation {
            Operation::RegisterStrategist { display_name } => {
                self.register_strategist(owner, display_name).await
            }
            Operation::CreateAgentStrategy {
                name,
                description,
                market_kind,
                base_market,
                is_public,
                is_ai_controlled,
            } => {
                self.create_strategy(owner, name, description, market_kind, base_market, is_public, is_ai_controlled).await
            }
            Operation::PublishSignal {
                strategy_id,
                direction,
                horizon_secs,
                confidence_bps,
                entry_value,
            } => {
                self.publish_signal(owner, strategy_id, direction, horizon_secs, confidence_bps, entry_value).await
            }
            Operation::ResolveSignal {
                signal_id,
                resolved_value,
            } => {
                self.resolve_signal(signal_id, resolved_value).await
            }
            Operation::CancelSignal { signal_id } => {
                self.cancel_signal(owner, signal_id).await
            }
            Operation::FollowStrategy {
                strategy_id,
                auto_copy,
                max_exposure_units,
            } => {
                self.follow_strategy(owner, strategy_id, auto_copy, max_exposure_units).await
            }
            Operation::UnfollowStrategy { strategy_id } => {
                self.unfollow_strategy(owner, strategy_id).await
            }
            Operation::UpdateStats { strategy_id } => {
                self.update_strategy_stats(strategy_id).await
            }
        }
    }

    async fn execute_message(&mut self, message: Message) {
        match message {
            Message::SignalResolved {
                signal_id: _,
                strategy_id,
                result: _,
                pnl_bps: _,
            } => {
                // Update stats on message receive (for cross-chain sync)
                let _ = self.update_strategy_stats(strategy_id).await;
            }
        }
    }

    async fn store(mut self) {
        self.state.save().await.expect("Failed to save state");
    }
}

impl AgentHubContract {
    /// Get current timestamp
    fn now(&mut self) -> linera_sdk::linera_base_types::Timestamp {
        self.runtime.system_time()
    }

    /// Register a new strategist
    async fn register_strategist(&mut self, owner: AccountOwner, display_name: String) -> AgentHubResponse {
        // Check if already registered
        if self.state.strategists.contains_key(&owner).await.unwrap_or(false) {
            return AgentHubError::StrategistAlreadyRegistered.into();
        }

        let strategist = agent_hub::Strategist {
            owner: owner.clone(),
            display_name,
            created_at: self.now(),
        };

        self.state.strategists.insert(&owner, strategist).expect("Failed to insert strategist");
        
        AgentHubResponse::StrategistRegistered { owner }
    }

    /// Create a new agent strategy
    async fn create_strategy(
        &mut self,
        owner: AccountOwner,
        name: String,
        description: String,
        market_kind: agent_hub::MarketKind,
        base_market: String,
        is_public: bool,
        is_ai_controlled: bool,
    ) -> AgentHubResponse {
        // Check if strategist is registered
        if !self.state.strategists.contains_key(&owner).await.unwrap_or(false) {
            return AgentHubError::StrategistNotRegistered.into();
        }

        // Get next strategy ID
        let id = *self.state.next_strategy_id.get();
        self.state.next_strategy_id.set(id + 1);

        let strategy = AgentStrategy {
            id,
            owner,
            name,
            description,
            market_kind,
            base_market,
            is_public,
            is_ai_controlled,
            created_at: self.now(),
        };

        self.state.strategies.insert(&id, strategy).expect("Failed to insert strategy");
        
        // Initialize empty signal list
        self.state.signals_by_strategy.insert(&id, Vec::new()).expect("Failed to init signals list");
        
        // Initialize stats
        let stats = StrategyStats {
            strategy_id: id,
            ..Default::default()
        };
        self.state.strategy_stats.insert(&id, stats).expect("Failed to init stats");

        // Initialize follower count
        self.state.follower_count.insert(&id, 0).expect("Failed to init follower count");

        AgentHubResponse::StrategyCreated { id }
    }

    /// Publish a new trading signal
    async fn publish_signal(
        &mut self,
        owner: AccountOwner,
        strategy_id: u64,
        direction: Direction,
        horizon_secs: u64,
        confidence_bps: u16,
        entry_value: Option<u64>,
    ) -> AgentHubResponse {
        // Validate confidence
        if confidence_bps > 10000 {
            return AgentHubError::InvalidConfidence.into();
        }

        // Check strategy exists and owned by caller
        let strategy = match self.state.strategies.get(&strategy_id).await {
            Ok(Some(s)) => s,
            _ => return AgentHubError::StrategyNotFound.into(),
        };

        if strategy.owner != owner {
            return AgentHubError::NotAuthorized.into();
        }

        // Get next signal ID
        let id = *self.state.next_signal_id.get();
        self.state.next_signal_id.set(id + 1);

        let now = self.now();
        let expires_at = linera_sdk::linera_base_types::Timestamp::from(
            now.micros() + (horizon_secs * 1_000_000)
        );

        let signal = Signal {
            id,
            strategy_id,
            created_at: now,
            expires_at,
            direction,
            entry_value,
            confidence_bps,
            status: SignalStatus::Open,
            result: None,
            pnl_bps: None,
            resolved_value: None,
        };

        self.state.signals.insert(&id, signal).expect("Failed to insert signal");

        // Add to strategy's signal list
        let mut signal_ids = self.state.signals_by_strategy.get(&strategy_id).await
            .ok().flatten().unwrap_or_default();
        signal_ids.push(id);
        self.state.signals_by_strategy.insert(&strategy_id, signal_ids)
            .expect("Failed to update signal list");

        AgentHubResponse::SignalPublished { id }
    }

    /// Resolve an open signal with the final value
    async fn resolve_signal(
        &mut self,
        signal_id: u64,
        resolved_value: u64,
    ) -> AgentHubResponse {
        // Get signal
        let mut signal = match self.state.signals.get(&signal_id).await {
            Ok(Some(s)) => s,
            _ => return AgentHubError::SignalNotFound.into(),
        };

        // Check signal is open
        if signal.status != SignalStatus::Open {
            return AgentHubError::SignalAlreadyResolved.into();
        }

        // Calculate result and PnL
        let (result, pnl_bps) = self.calculate_signal_result(&signal, resolved_value);

        // Update signal
        signal.status = SignalStatus::Resolved;
        signal.result = Some(result);
        signal.pnl_bps = Some(pnl_bps);
        signal.resolved_value = Some(resolved_value);

        let strategy_id = signal.strategy_id;
        self.state.signals.insert(&signal_id, signal)
            .expect("Failed to update signal");

        // Update strategy stats
        let _ = self.update_strategy_stats(strategy_id).await;

        AgentHubResponse::SignalResolved {
            id: signal_id,
            result,
            pnl_bps,
        }
    }

    /// Calculate signal result based on direction and price movement
    fn calculate_signal_result(&self, signal: &Signal, resolved_value: u64) -> (SignalResult, i64) {
        let entry = signal.entry_value.unwrap_or(0);
        
        if entry == 0 || resolved_value == 0 {
            return (SignalResult::Push, 0);
        }

        // Calculate PnL in basis points
        let pnl_bps = ((resolved_value as i64 - entry as i64) * 10000) / entry as i64;

        // Determine result based on direction
        let result = match signal.direction {
            Direction::Up | Direction::Over | Direction::Yes => {
                if resolved_value > entry {
                    SignalResult::Win
                } else if resolved_value < entry {
                    SignalResult::Lose
                } else {
                    SignalResult::Push
                }
            }
            Direction::Down | Direction::Under | Direction::No => {
                if resolved_value < entry {
                    SignalResult::Win
                } else if resolved_value > entry {
                    SignalResult::Lose
                } else {
                    SignalResult::Push
                }
            }
        };

        // Adjust PnL sign based on direction (for DOWN, negative price move = positive PnL)
        let adjusted_pnl = match signal.direction {
            Direction::Down | Direction::Under | Direction::No => -pnl_bps,
            _ => pnl_bps,
        };

        (result, adjusted_pnl)
    }

    /// Cancel an open signal
    async fn cancel_signal(&mut self, owner: AccountOwner, signal_id: u64) -> AgentHubResponse {
        // Get signal
        let mut signal = match self.state.signals.get(&signal_id).await {
            Ok(Some(s)) => s,
            _ => return AgentHubError::SignalNotFound.into(),
        };

        // Check authorization
        let strategy = match self.state.strategies.get(&signal.strategy_id).await {
            Ok(Some(s)) => s,
            _ => return AgentHubError::StrategyNotFound.into(),
        };

        if strategy.owner != owner {
            return AgentHubError::NotAuthorized.into();
        }

        // Check signal is open
        if signal.status != SignalStatus::Open {
            return AgentHubError::SignalNotOpen.into();
        }

        // Cancel signal
        signal.status = SignalStatus::Cancelled;
        self.state.signals.insert(&signal_id, signal)
            .expect("Failed to update signal");

        AgentHubResponse::SignalCancelled { id: signal_id }
    }

    /// Follow a strategy
    async fn follow_strategy(
        &mut self,
        follower_owner: AccountOwner,
        strategy_id: u64,
        auto_copy: bool,
        max_exposure_units: u64,
    ) -> AgentHubResponse {
        // Check strategy exists
        if !self.state.strategies.contains_key(&strategy_id).await.unwrap_or(false) {
            return AgentHubError::StrategyNotFound.into();
        }

        let key = FollowerKey { strategy_id, follower: follower_owner.clone() };

        // Check not already following
        if self.state.followers.contains_key(&key).await.unwrap_or(false) {
            return AgentHubError::AlreadyFollowing.into();
        }

        let follower = Follower {
            strategy_id,
            follower: follower_owner,
            auto_copy,
            max_exposure_units,
            created_at: self.now(),
        };

        self.state.followers.insert(&key, follower)
            .expect("Failed to insert follower");

        // Increment follower count
        let count = self.state.follower_count.get(&strategy_id).await
            .ok().flatten().unwrap_or(0);
        self.state.follower_count.insert(&strategy_id, count + 1)
            .expect("Failed to update follower count");

        // Update stats
        let mut stats = self.state.strategy_stats.get(&strategy_id).await
            .ok().flatten().unwrap_or_default();
        stats.followers = count + 1;
        self.state.strategy_stats.insert(&strategy_id, stats)
            .expect("Failed to update stats");

        AgentHubResponse::Followed { strategy_id }
    }

    /// Unfollow a strategy
    async fn unfollow_strategy(&mut self, follower_owner: AccountOwner, strategy_id: u64) -> AgentHubResponse {
        let key = FollowerKey { strategy_id, follower: follower_owner };

        // Check following
        if !self.state.followers.contains_key(&key).await.unwrap_or(false) {
            return AgentHubError::NotFollowing.into();
        }

        self.state.followers.remove(&key).expect("Failed to remove follower");

        // Decrement follower count
        let count = self.state.follower_count.get(&strategy_id).await
            .ok().flatten().unwrap_or(1);
        let new_count = count.saturating_sub(1);
        self.state.follower_count.insert(&strategy_id, new_count)
            .expect("Failed to update follower count");

        // Update stats
        let mut stats = self.state.strategy_stats.get(&strategy_id).await
            .ok().flatten().unwrap_or_default();
        stats.followers = new_count;
        self.state.strategy_stats.insert(&strategy_id, stats)
            .expect("Failed to update stats");

        AgentHubResponse::Unfollowed { strategy_id }
    }

    /// Update strategy statistics based on all signals
    async fn update_strategy_stats(&mut self, strategy_id: u64) -> AgentHubResponse {
        let signal_ids = self.state.signals_by_strategy.get(&strategy_id).await
            .ok().flatten().unwrap_or_default();

        let mut total_signals = 0u64;
        let mut winning_signals = 0u64;
        let mut losing_signals = 0u64;
        let mut push_signals = 0u64;
        let mut total_pnl: i64 = 0;

        for signal_id in signal_ids {
            if let Ok(Some(signal)) = self.state.signals.get(&signal_id).await {
                if signal.status == SignalStatus::Resolved {
                    total_signals += 1;
                    total_pnl += signal.pnl_bps.unwrap_or(0);

                    match signal.result {
                        Some(SignalResult::Win) => winning_signals += 1,
                        Some(SignalResult::Lose) => losing_signals += 1,
                        Some(SignalResult::Push) => push_signals += 1,
                        None => {}
                    }
                }
            }
        }

        let win_rate_bps = if total_signals > 0 {
            ((winning_signals as u64 * 10000) / total_signals) as u32
        } else {
            0
        };

        let avg_pnl_bps = if total_signals > 0 {
            (total_pnl / total_signals as i64) as i32
        } else {
            0
        };

        let followers = self.state.follower_count.get(&strategy_id).await
            .ok().flatten().unwrap_or(0);

        let stats = StrategyStats {
            strategy_id,
            total_signals,
            winning_signals,
            losing_signals,
            push_signals,
            win_rate_bps,
            avg_pnl_bps,
            total_pnl_bps: total_pnl,
            followers,
        };

        self.state.strategy_stats.insert(&strategy_id, stats)
            .expect("Failed to update stats");

        AgentHubResponse::Ok
    }
}
