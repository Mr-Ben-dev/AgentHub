// ============================================================================
// Linera Types - TypeScript types matching the Rust contract
// ============================================================================

// Market kind enum
export type MarketKind = 'Crypto' | 'Sports' | 'PredictionApp';

// Direction enum
export type Direction = 'Up' | 'Down' | 'Over' | 'Under' | 'Yes' | 'No';

// Signal status enum
export type SignalStatus = 'Open' | 'ResolvedWin' | 'ResolvedLoss' | 'Cancelled';

// Strategist (on-chain)
export interface LineraStrategist {
  wallet: string;
  name: string;
  bio: string;
  avatar_url: string;
  registered_at: number;
}

// Agent Strategy (on-chain)
export interface LineraAgentStrategy {
  id: number;
  name: string;
  description: string;
  market_kind: MarketKind;
  is_public: boolean;
  creator: string;
  created_at: number;
}

// Signal (on-chain)
export interface LineraSignal {
  id: number;
  strategy_id: number;
  market: string;
  direction: Direction;
  entry_price: number;
  target_price: number | null;
  stop_loss: number | null;
  confidence: number;
  reasoning: string;
  status: SignalStatus;
  exit_price: number | null;
  pnl_percent: number | null;
  created_at: number;
  expires_at: number | null;
  resolved_at: number | null;
}

// Strategy Stats (on-chain)
export interface LineraStrategyStats {
  total_signals: number;
  wins: number;
  losses: number;
  win_rate: number;
  total_pnl: number;
  avg_pnl: number;
  best_win: number;
  worst_loss: number;
  current_streak: number;
  followers: number;
}

// Operations (mutations)
export type LineraOperation =
  | { RegisterStrategist: { name: string; bio: string; avatar_url: string } }
  | { CreateAgentStrategy: { name: string; description: string; market_kind: MarketKind; is_public: boolean } }
  | { PublishSignal: PublishSignalInput }
  | { ResolveSignal: { signal_id: number; exit_price: number } }
  | { CancelSignal: { signal_id: number } }
  | { FollowStrategy: { strategy_id: number } }
  | { UnfollowStrategy: { strategy_id: number } };

export interface PublishSignalInput {
  strategy_id: number;
  market: string;
  direction: Direction;
  entry_price: number;
  target_price: number | null;
  stop_loss: number | null;
  confidence: number;
  reasoning: string;
  expires_at: number | null;
}

// Query responses
export interface PublicStrategiesResponse {
  publicStrategies: Array<{
    strategy: LineraAgentStrategy;
    stats: LineraStrategyStats;
  }>;
}

export interface StrategyResponse {
  strategy: {
    strategy: LineraAgentStrategy;
    stats: LineraStrategyStats;
  } | null;
}

export interface StrategySignalsResponse {
  strategySignals: LineraSignal[];
}

export interface TopStrategiesResponse {
  topStrategies: Array<{
    strategy: LineraAgentStrategy;
    stats: LineraStrategyStats;
  }>;
}

export interface OpenSignalsResponse {
  openSignals: LineraSignal[];
}

export interface RecentSignalsResponse {
  recentSignals: LineraSignal[];
}

export interface MyStrategiesResponse {
  myStrategies: Array<{
    strategy: LineraAgentStrategy;
    stats: LineraStrategyStats;
  }>;
}

export interface IsStrategistResponse {
  isStrategist: boolean;
}
