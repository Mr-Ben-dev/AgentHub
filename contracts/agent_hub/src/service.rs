#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use std::sync::Arc;

use agent_hub::{
    AgentHubAbi, AgentStrategy, MarketKind, Operation, Signal, SignalStatus,
    StrategyStats, StrategyWithStats, Subscription, SubscriptionOffer,
};
use async_graphql::{EmptySubscription, Object, Schema};
use linera_sdk::{
    graphql::GraphQLMutationRoot as _,
    linera_base_types::{AccountOwner, WithServiceAbi},
    views::View,
    Service, ServiceRuntime,
};

use self::state::AgentHubState;

/// The AgentHub service for GraphQL queries.
#[derive(Clone)]
pub struct AgentHubService {
    runtime: Arc<ServiceRuntime<Self>>,
}

linera_sdk::service!(AgentHubService);

impl WithServiceAbi for AgentHubService {
    type Abi = AgentHubAbi;
}

impl Service for AgentHubService {
    type Parameters = ();

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        AgentHubService {
            runtime: Arc::new(runtime),
        }
    }

    async fn handle_query(&self, request: Self::Query) -> Self::QueryResponse {
        // Load fresh state for each query to ensure we see latest updates
        let state = AgentHubState::load(self.runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        
        let schema = Schema::build(
            QueryRoot {
                state: Arc::new(state),
            },
            Operation::mutation_root(self.runtime.clone()),
            EmptySubscription,
        )
        .finish();
        schema.execute(request).await
    }
}

// ============================================================================
// QUERY ROOT
// ============================================================================

struct QueryRoot {
    state: Arc<AgentHubState>,
}

#[Object]
impl QueryRoot {
    /// Get all public strategies with optional filtering
    async fn public_strategies(
        &self,
        market_kind: Option<MarketKind>,
        base_market: Option<String>,
        limit: Option<i32>,
        offset: Option<i32>,
    ) -> Vec<AgentStrategy> {
        let limit = limit.unwrap_or(50) as usize;
        let offset = offset.unwrap_or(0) as usize;
        
        let mut strategies = Vec::new();
        let mut count = 0u64;
        
        // Iterate through all strategies
        loop {
            count += 1;
            if let Ok(Some(strategy)) = self.state.strategies.get(&count).await {
                // Filter by public
                if !strategy.is_public {
                    continue;
                }
                
                // Filter by market_kind if specified
                if let Some(ref mk) = market_kind {
                    if &strategy.market_kind != mk {
                        continue;
                    }
                }
                
                // Filter by base_market if specified
                if let Some(ref bm) = base_market {
                    if &strategy.base_market != bm {
                        continue;
                    }
                }
                
                strategies.push(strategy);
            } else {
                break;
            }
        }
        
        // Apply pagination
        strategies.into_iter().skip(offset).take(limit).collect()
    }

    /// Get a single strategy by ID
    async fn strategy(&self, id: u64) -> Option<AgentStrategy> {
        self.state.strategies.get(&id).await.ok().flatten()
    }

    /// Get signals for a strategy
    async fn strategy_signals(
        &self,
        strategy_id: u64,
        limit: Option<i32>,
        offset: Option<i32>,
    ) -> Vec<Signal> {
        let limit = limit.unwrap_or(50) as usize;
        let offset = offset.unwrap_or(0) as usize;
        
        let signal_ids = self.state.signals_by_strategy.get(&strategy_id).await
            .ok().flatten().unwrap_or_default();
        
        let mut signals = Vec::new();
        for signal_id in signal_ids {
            if let Ok(Some(signal)) = self.state.signals.get(&signal_id).await {
                signals.push(signal);
            }
        }
        
        // Sort by created_at DESC (newest first)
        signals.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        
        signals.into_iter().skip(offset).take(limit).collect()
    }

    /// Get a single signal by ID
    async fn signal(&self, id: u64) -> Option<Signal> {
        self.state.signals.get(&id).await.ok().flatten()
    }

    /// Get strategy statistics
    async fn strategy_stats(&self, strategy_id: u64) -> Option<StrategyStats> {
        self.state.strategy_stats.get(&strategy_id).await.ok().flatten()
    }

    /// Get top strategies by win rate
    async fn top_strategies(&self, limit: Option<i32>) -> Vec<StrategyWithStats> {
        let limit = limit.unwrap_or(10) as usize;
        
        let mut strategies_with_stats = Vec::new();
        let mut count = 0u64;
        
        // Collect all public strategies with their stats
        loop {
            count += 1;
            match self.state.strategies.get(&count).await {
                Ok(Some(strategy)) if strategy.is_public => {
                    let stats = self.state.strategy_stats.get(&count).await
                        .ok().flatten().unwrap_or_default();
                    
                    // Only include strategies with at least 1 resolved signal
                    if stats.total_signals > 0 {
                        strategies_with_stats.push(StrategyWithStats { strategy, stats });
                    }
                }
                Ok(Some(_)) => continue,
                _ => break,
            }
        }
        
        // Sort by win rate DESC, then by total PnL DESC
        strategies_with_stats.sort_by(|a, b| {
            b.stats.win_rate_bps.cmp(&a.stats.win_rate_bps)
                .then_with(|| b.stats.total_pnl_bps.cmp(&a.stats.total_pnl_bps))
        });
        
        strategies_with_stats.into_iter().take(limit).collect()
    }

    /// Get all open signals across all strategies
    async fn open_signals(&self, limit: Option<i32>) -> Vec<Signal> {
        let limit = limit.unwrap_or(50) as usize;
        
        let mut signals = Vec::new();
        let mut count = 0u64;
        
        loop {
            count += 1;
            match self.state.signals.get(&count).await {
                Ok(Some(signal)) if signal.status == SignalStatus::Open => {
                    signals.push(signal);
                }
                Ok(Some(_)) => continue,
                _ => break,
            }
        }
        
        // Sort by created_at DESC
        signals.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        
        signals.into_iter().take(limit).collect()
    }

    /// Get recent signals
    async fn recent_signals(&self, limit: Option<i32>) -> Vec<Signal> {
        let limit = limit.unwrap_or(50) as usize;
        
        let mut signals = Vec::new();
        let mut count = 0u64;
        
        loop {
            count += 1;
            match self.state.signals.get(&count).await {
                Ok(Some(signal)) => {
                    signals.push(signal);
                }
                _ => break,
            }
        }
        
        // Sort by created_at DESC
        signals.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        
        signals.into_iter().take(limit).collect()
    }

    /// Check if a user is following a strategy
    async fn is_following(
        &self,
        strategy_id: u64,
        follower: String,
    ) -> bool {
        // Parse follower address
        let follower_owner: AccountOwner = match follower.parse() {
            Ok(o) => o,
            Err(_) => return false,
        };
        
        let key = agent_hub::FollowerKey {
            strategy_id,
            follower: follower_owner,
        };
        self.state.followers.contains_key(&key).await.unwrap_or(false)
    }

    /// Get strategies owned by a specific user
    async fn my_strategies(&self, owner: String) -> Vec<AgentStrategy> {
        let owner_account: AccountOwner = match owner.parse() {
            Ok(o) => o,
            Err(_) => return Vec::new(),
        };
        
        let mut strategies = Vec::new();
        let mut count = 0u64;
        
        loop {
            count += 1;
            match self.state.strategies.get(&count).await {
                Ok(Some(strategy)) if strategy.owner == owner_account => {
                    strategies.push(strategy);
                }
                Ok(Some(_)) => continue,
                _ => break,
            }
        }
        
        strategies
    }

    /// Check if a user is registered as a strategist
    async fn is_strategist(&self, owner: String) -> bool {
        let owner_account: AccountOwner = match owner.parse() {
            Ok(o) => o,
            Err(_) => return false,
        };
        
        self.state.strategists.contains_key(&owner_account).await.unwrap_or(false)
    }

    // =========================================================================
    // Subscription Queries
    // =========================================================================

    /// Get subscription offer for a strategist
    async fn subscription_offer(&self, strategist: String) -> Option<SubscriptionOffer> {
        let strategist_account: AccountOwner = match strategist.parse() {
            Ok(o) => o,
            Err(_) => return None,
        };
        
        self.state.subscription_offers.get(&strategist_account).await.ok().flatten()
    }

    /// Get all strategists with active subscription offers
    async fn subscription_offers(&self, limit: Option<i32>) -> Vec<SubscriptionOffer> {
        let limit = limit.unwrap_or(50) as usize;
        let mut offers = Vec::new();
        
        // Iterate through strategists and check for subscription offers
        let mut strategist_iter = self.state.strategists.indices().await.ok().unwrap_or_default();
        
        for strategist in strategist_iter.drain(..).take(limit * 2) {
            if let Ok(Some(offer)) = self.state.subscription_offers.get(&strategist).await {
                if offer.is_enabled {
                    offers.push(offer);
                }
            }
        }
        
        offers.into_iter().take(limit).collect()
    }

    /// Get subscriptions for a subscriber
    async fn my_subscriptions(&self, subscriber: String) -> Vec<Subscription> {
        let subscriber_account: AccountOwner = match subscriber.parse() {
            Ok(o) => o,
            Err(_) => return Vec::new(),
        };
        
        let sub_ids = self.state.subscriptions_by_subscriber.get(&subscriber_account).await
            .ok().flatten().unwrap_or_default();
        
        let mut subscriptions = Vec::new();
        for sub_id in sub_ids {
            if let Ok(Some(sub)) = self.state.subscriptions.get(&sub_id).await {
                subscriptions.push(sub);
            }
        }
        
        subscriptions
    }

    /// Get subscribers for a strategist
    async fn subscribers_of(&self, strategist: String) -> Vec<Subscription> {
        let strategist_account: AccountOwner = match strategist.parse() {
            Ok(o) => o,
            Err(_) => return Vec::new(),
        };
        
        let sub_ids = self.state.subscribers_by_strategist.get(&strategist_account).await
            .ok().flatten().unwrap_or_default();
        
        let mut subscriptions = Vec::new();
        for sub_id in sub_ids {
            if let Ok(Some(sub)) = self.state.subscriptions.get(&sub_id).await {
                if sub.is_active {
                    subscriptions.push(sub);
                }
            }
        }
        
        subscriptions
    }

    /// Check if a user is subscribed to a strategist
    async fn is_subscribed(&self, subscriber: String, strategist: String) -> bool {
        let subscriber_account: AccountOwner = match subscriber.parse() {
            Ok(o) => o,
            Err(_) => return false,
        };
        
        let strategist_account: AccountOwner = match strategist.parse() {
            Ok(o) => o,
            Err(_) => return false,
        };
        
        let sub_ids = self.state.subscriptions_by_subscriber.get(&subscriber_account).await
            .ok().flatten().unwrap_or_default();
        
        for sub_id in sub_ids {
            if let Ok(Some(sub)) = self.state.subscriptions.get(&sub_id).await {
                if sub.strategist == strategist_account && sub.is_active {
                    return true;
                }
            }
        }
        
        false
    }
}
