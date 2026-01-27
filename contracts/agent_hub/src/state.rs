// State management for AgentHub

use agent_hub::{
    AgentStrategy, Follower, FollowerKey, Signal, StrategyStats, Strategist,
    Subscription, SubscriptionOffer,
};
use linera_sdk::{
    linera_base_types::{AccountOwner, ChainId},
    views::{linera_views, MapView, RegisterView, RootView, ViewStorageContext},
};

/// The application state stored on each chain.
#[derive(RootView)]
#[view(context = ViewStorageContext)]
pub struct AgentHubState {
    /// Hub chain ID for cross-chain communication
    pub hub_chain_id: RegisterView<Option<ChainId>>,
    
    /// Registered strategists
    pub strategists: MapView<AccountOwner, Strategist>,
    
    /// All strategies
    pub strategies: MapView<u64, AgentStrategy>,
    
    /// All signals (keyed by signal ID)
    pub signals: MapView<u64, Signal>,
    
    /// Signals by strategy (strategy_id -> list of signal IDs)
    pub signals_by_strategy: MapView<u64, Vec<u64>>,
    
    /// Strategy statistics
    pub strategy_stats: MapView<u64, StrategyStats>,
    
    /// Followers (FollowerKey -> Follower)
    pub followers: MapView<FollowerKey, Follower>,
    
    /// Follower count per strategy
    pub follower_count: MapView<u64, u64>,
    
    /// Counter for next strategy ID
    pub next_strategy_id: RegisterView<u64>,
    
    /// Counter for next signal ID
    pub next_signal_id: RegisterView<u64>,
    
    // =========================================================================
    // Subscription State
    // =========================================================================
    
    /// Subscription offers by strategist (strategist -> SubscriptionOffer)
    pub subscription_offers: MapView<AccountOwner, SubscriptionOffer>,
    
    /// Active subscriptions (subscription_id -> Subscription)
    pub subscriptions: MapView<String, Subscription>,
    
    /// Subscriptions by subscriber (subscriber -> list of subscription IDs)
    pub subscriptions_by_subscriber: MapView<AccountOwner, Vec<String>>,
    
    /// Subscribers by strategist (strategist -> list of subscription IDs)
    pub subscribers_by_strategist: MapView<AccountOwner, Vec<String>>,
    
    /// Counter for subscription ID
    pub next_subscription_id: RegisterView<u64>,
}
