// ============================================================================
// AgentHub Backend - Types
// ============================================================================

export type MarketKind = 'Crypto' | 'Sports' | 'PredictionApp';
export type Direction = 'Up' | 'Down' | 'Over' | 'Under' | 'Yes' | 'No';
export type SignalStatus = 'open' | 'resolved' | 'cancelled';
export type SignalResult = 'win' | 'lose' | 'push';

export interface Strategist {
  id: number;
  wallet_address: string;
  display_name: string;
  created_at: Date;
}

export interface AgentStrategy {
  id: number;
  onchain_id: number | null;
  owner_wallet: string;
  name: string;
  description: string;
  market_kind: MarketKind;
  base_market: string;
  is_public: boolean;
  is_ai_controlled: boolean;
  created_at: Date;
}

export interface Signal {
  id: number;
  onchain_id: number | null;
  strategy_id: number;
  direction: Direction;
  entry_value: number | null;
  confidence_bps: number;
  status: SignalStatus;
  result: SignalResult | null;
  pnl_bps: number | null;
  resolved_value: number | null;
  asset: string | null;  // e.g., 'BTC/USD', 'ETH/USD' - the actual asset for this signal
  created_at: Date;
  expires_at: Date;
  resolved_at: Date | null;
}

export interface StrategyStats {
  id: number;
  strategy_id: number;
  total_signals: number;
  winning_signals: number;
  losing_signals: number;
  win_rate_bps: number;
  avg_pnl_bps: number;
  total_pnl_bps: number;
  best_win_bps: number;
  worst_loss_bps: number;
  followers_count: number;
  updated_at: Date;
}

export interface Follower {
  id: number;
  strategy_id: number;
  wallet_address: string;
  auto_copy: boolean;
  max_exposure_units: number;
  created_at: Date;
}

export interface ActivityLog {
  id: number;
  wallet_address: string;
  username: string;
  action: string;
  details: Record<string, unknown>;
  created_at: Date;
}

export interface StrategyWithStats extends AgentStrategy {
  stats: StrategyStats;
}

// Input types
export interface CreateStrategistInput {
  wallet_address: string;
  display_name: string;
}

export interface CreateStrategyInput {
  wallet_address: string;
  onchain_id?: number;
  name: string;
  description: string;
  market_kind: MarketKind;
  base_market: string;
  is_public: boolean;
  is_ai_controlled: boolean;
}

export interface CreateSignalInput {
  onchain_id?: number;
  strategy_id: number;
  direction: Direction;
  entry_value?: number;
  confidence_bps: number;
  expires_at: Date;
  asset?: string;  // e.g., 'BTC/USD', 'ETH/USD'
}

export interface ResolveSignalInput {
  signal_id: number;
  resolved_value: number;
}

export interface FollowStrategyInput {
  strategy_id: number;
  wallet_address: string;
  auto_copy: boolean;
  max_exposure_units: number;
}

export interface LogActivityInput {
  wallet_address: string;
  username: string;
  action: string;
  details: Record<string, unknown>;
}

// Price types
export interface CryptoPrice {
  symbol: string;
  price: number; // in cents
  formatted: string;
  timestamp: Date;
}

// Database interface
export interface Database {
  // Strategists
  createStrategist(input: CreateStrategistInput): Promise<Strategist>;
  getStrategist(wallet: string): Promise<Strategist | null>;
  getAllStrategists(): Promise<Strategist[]>;

  // Strategies
  createStrategy(input: CreateStrategyInput): Promise<AgentStrategy>;
  getStrategy(id: number): Promise<AgentStrategy | null>;
  getStrategyByOnchainId(onchainId: number): Promise<AgentStrategy | null>;
  getStrategies(filters?: {
    market_kind?: MarketKind;
    base_market?: string;
    owner_wallet?: string;
    is_public?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<AgentStrategy[]>;
  updateStrategyOnchainId(id: number, onchainId: number): Promise<void>;

  // Signals
  createSignal(input: CreateSignalInput): Promise<Signal>;
  getSignal(id: number): Promise<Signal | null>;
  getSignalByOnchainId(onchainId: number): Promise<Signal | null>;
  getSignalsByStrategy(strategyId: number, limit?: number): Promise<Signal[]>;
  getOpenSignals(): Promise<Signal[]>;
  getExpiredUnresolvedSignals(): Promise<Signal[]>;
  getRecentSignals(limit?: number): Promise<Signal[]>;
  resolveSignal(input: ResolveSignalInput): Promise<Signal | null>;
  cancelSignal(signalId: number): Promise<Signal | null>;

  // Stats
  getStrategyStats(strategyId: number): Promise<StrategyStats | null>;
  updateStrategyStats(strategyId: number): Promise<StrategyStats>;
  getTopStrategies(limit?: number): Promise<StrategyWithStats[]>;

  // Followers
  followStrategy(input: FollowStrategyInput): Promise<Follower>;
  unfollowStrategy(strategyId: number, wallet: string): Promise<void>;
  getFollowers(strategyId: number): Promise<Follower[]>;
  isFollowing(strategyId: number, wallet: string): Promise<boolean>;
  getFollowerCount(strategyId: number): Promise<number>;

  // Activity
  logActivity(input: LogActivityInput): Promise<ActivityLog>;
  getActivityFeed(limit?: number): Promise<ActivityLog[]>;
  getUserActivity(wallet: string, limit?: number): Promise<ActivityLog[]>;

  // Utility
  getGlobalStats(): Promise<{
    total_strategists: number;
    total_strategies: number;
    total_signals: number;
    total_resolved: number;
  }>;
}
