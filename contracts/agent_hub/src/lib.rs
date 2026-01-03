// Linera AgentHub - AI Agents with Verifiable On-Chain Track Records
// 
// Deploy command:
// linera publish-and-create \
//   target/wasm32-unknown-unknown/release/agent_hub_contract.wasm \
//   target/wasm32-unknown-unknown/release/agent_hub_service.wasm \
//   --json-argument '{"hub_chain_id": "<HUB_CHAIN_ID>"}'

use async_graphql::{Enum, InputObject, Request, Response, SimpleObject};
use linera_sdk::{
    graphql::GraphQLMutationRoot,
    linera_base_types::{AccountOwner, Timestamp, ContractAbi, ServiceAbi},
};
use serde::{Deserialize, Serialize};
use thiserror::Error;

// ============================================================================
// ENUMS
// ============================================================================

/// Market type for the strategy
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum)]
pub enum MarketKind {
    /// Crypto markets (BTC, ETH via oracle)
    Crypto,
    /// Sports betting markets
    Sports,
    /// External prediction apps (Arcade, LineraOdds, TrueMarket)
    PredictionApp,
}

impl Default for MarketKind {
    fn default() -> Self {
        MarketKind::Crypto
    }
}

/// Signal direction prediction
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum)]
pub enum Direction {
    Up,
    Down,
    Over,
    Under,
    Yes,
    No,
}

/// Status of a signal
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum)]
pub enum SignalStatus {
    Open,
    Resolved,
    Cancelled,
}

impl Default for SignalStatus {
    fn default() -> Self {
        SignalStatus::Open
    }
}

/// Result of a resolved signal
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum)]
pub enum SignalResult {
    Win,
    Lose,
    Push,
}

// ============================================================================
// STRUCTS
// ============================================================================

/// A strategist who creates and manages agent strategies
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct Strategist {
    pub owner: AccountOwner,
    pub display_name: String,
    pub created_at: Timestamp,
}

/// An AI agent strategy that publishes trading signals
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct AgentStrategy {
    pub id: u64,
    pub owner: AccountOwner,
    pub name: String,
    pub description: String,
    pub market_kind: MarketKind,
    /// Base market (e.g., "BTC-USD", "ETH-USD", "Arcade-BTC5m")
    pub base_market: String,
    pub is_public: bool,
    pub is_ai_controlled: bool,
    pub created_at: Timestamp,
}

/// A trading signal published by an agent strategy
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct Signal {
    pub id: u64,
    pub strategy_id: u64,
    pub created_at: Timestamp,
    pub expires_at: Timestamp,
    pub direction: Direction,
    /// Entry price/value at signal time (in cents for crypto)
    pub entry_value: Option<u64>,
    /// Confidence in basis points (0-10000 = 0-100%)
    pub confidence_bps: u16,
    pub status: SignalStatus,
    pub result: Option<SignalResult>,
    /// PnL in basis points (can be negative)
    pub pnl_bps: Option<i64>,
    /// Resolved value (price at expiration)
    pub resolved_value: Option<u64>,
}

/// Aggregated statistics for a strategy
#[derive(Debug, Clone, Default, Serialize, Deserialize, SimpleObject)]
pub struct StrategyStats {
    pub strategy_id: u64,
    pub total_signals: u64,
    pub winning_signals: u64,
    pub losing_signals: u64,
    pub push_signals: u64,
    /// Win rate in basis points (0-10000 = 0-100%)
    pub win_rate_bps: u32,
    /// Average PnL in basis points
    pub avg_pnl_bps: i32,
    pub total_pnl_bps: i64,
    pub followers: u64,
}

/// Strategy combined with its stats for leaderboard display
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct StrategyWithStats {
    pub strategy: AgentStrategy,
    pub stats: StrategyStats,
}

/// A follower relationship
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct Follower {
    pub strategy_id: u64,
    pub follower: AccountOwner,
    pub auto_copy: bool,
    pub max_exposure_units: u64,
    pub created_at: Timestamp,
}

/// Key for follower map (strategy_id + follower)
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord, SimpleObject, InputObject)]
#[graphql(input_name = "FollowerKeyInput")]
pub struct FollowerKey {
    pub strategy_id: u64,
    pub follower: AccountOwner,
}

// ============================================================================
// INPUT TYPES (for GraphQL mutations)
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, InputObject)]
pub struct CreateStrategyInput {
    pub name: String,
    pub description: String,
    pub market_kind: MarketKind,
    pub base_market: String,
    pub is_public: bool,
    pub is_ai_controlled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, InputObject)]
pub struct PublishSignalInput {
    pub strategy_id: u64,
    pub direction: Direction,
    /// Signal horizon in seconds (e.g., 300 for 5 minutes)
    pub horizon_secs: u64,
    /// Confidence in basis points (0-10000)
    pub confidence_bps: u16,
    /// Entry value/price (optional, can be set by backend)
    pub entry_value: Option<u64>,
}

// ============================================================================
// OPERATIONS
// ============================================================================

/// Operations that can be executed on the AgentHub contract
#[derive(Debug, Clone, Serialize, Deserialize, GraphQLMutationRoot)]
pub enum Operation {
    /// Register as a strategist
    RegisterStrategist { display_name: String },
    
    /// Create a new agent strategy
    CreateAgentStrategy {
        name: String,
        description: String,
        market_kind: MarketKind,
        base_market: String,
        is_public: bool,
        is_ai_controlled: bool,
    },
    
    /// Publish a new trading signal
    PublishSignal {
        strategy_id: u64,
        direction: Direction,
        horizon_secs: u64,
        confidence_bps: u16,
        entry_value: Option<u64>,
    },
    
    /// Resolve an open signal with the final value
    ResolveSignal {
        signal_id: u64,
        resolved_value: u64,
    },
    
    /// Cancel an open signal
    CancelSignal { signal_id: u64 },
    
    /// Follow a strategy
    FollowStrategy {
        strategy_id: u64,
        auto_copy: bool,
        max_exposure_units: u64,
    },
    
    /// Unfollow a strategy
    UnfollowStrategy { strategy_id: u64 },
    
    /// Update strategy stats (internal, called after signal resolution)
    UpdateStats { strategy_id: u64 },
}

/// Messages that can be sent between chains
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Message {
    /// Sync signal data across chains
    SignalResolved {
        signal_id: u64,
        strategy_id: u64,
        result: SignalResult,
        pnl_bps: i64,
    },
}

/// Response from contract operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AgentHubResponse {
    Ok,
    StrategistRegistered { owner: AccountOwner },
    StrategyCreated { id: u64 },
    SignalPublished { id: u64 },
    SignalResolved { id: u64, result: SignalResult, pnl_bps: i64 },
    SignalCancelled { id: u64 },
    Followed { strategy_id: u64 },
    Unfollowed { strategy_id: u64 },
    Error { message: String },
}

// ============================================================================
// ERRORS
// ============================================================================

#[derive(Debug, Error)]
pub enum AgentHubError {
    #[error("Strategist not registered")]
    StrategistNotRegistered,
    
    #[error("Strategist already registered")]
    StrategistAlreadyRegistered,
    
    #[error("Strategy not found")]
    StrategyNotFound,
    
    #[error("Signal not found")]
    SignalNotFound,
    
    #[error("Signal already resolved")]
    SignalAlreadyResolved,
    
    #[error("Signal not open")]
    SignalNotOpen,
    
    #[error("Not authorized")]
    NotAuthorized,
    
    #[error("Already following")]
    AlreadyFollowing,
    
    #[error("Not following")]
    NotFollowing,
    
    #[error("Invalid confidence value")]
    InvalidConfidence,
    
    #[error("Internal error: {0}")]
    Internal(String),
}

impl From<AgentHubError> for AgentHubResponse {
    fn from(error: AgentHubError) -> Self {
        AgentHubResponse::Error {
            message: error.to_string(),
        }
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/// Initialization arguments for the contract
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstantiationArgument {
    pub hub_chain_id: String,
}

// ============================================================================
// ABI
// ============================================================================

/// ABI definition for the AgentHub application
pub struct AgentHubAbi;

impl ContractAbi for AgentHubAbi {
    type Operation = Operation;
    type Response = AgentHubResponse;
}

impl ServiceAbi for AgentHubAbi {
    type Query = Request;
    type QueryResponse = Response;
}
