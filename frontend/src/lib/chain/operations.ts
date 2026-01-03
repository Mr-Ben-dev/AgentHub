// ============================================================================
// Chain Operations - GraphQL Queries & Mutations for AgentHub on Linera
// ============================================================================

import { chainQuery, chainMutate, chainManager, connectApp } from './connection';

// Helper to ensure app is connected before operations
async function ensureAppConnected(): Promise<void> {
  if (!chainManager.isConnected()) {
    throw new Error('Must connect to Conway testnet first. Please connect your wallet.');
  }
  if (!chainManager.isAppConnected()) {
    console.log('📱 Auto-connecting to AgentHub application...');
    await connectApp();
  }
}

// ============================================================================
// GraphQL Query Definitions
// ============================================================================

/**
 * Get strategist data by wallet address
 */
export const GET_STRATEGIST = `
  query GetStrategist($wallet: String!) {
    strategist(wallet: $wallet) {
      wallet
      name
      bio
      registeredAt
      totalStrategies
      totalSignals
      totalFollowers
    }
  }
`;

/**
 * Get all strategies with optional filters
 */
export const GET_STRATEGIES = `
  query GetStrategies($marketKind: String, $isPublic: Boolean, $limit: Int) {
    strategies(marketKind: $marketKind, isPublic: $isPublic, limit: $limit) {
      id
      name
      description
      marketKind
      creatorWallet
      creatorName
      isPublic
      createdAt
      stats {
        totalSignals
        wins
        losses
        winRate
        totalPnl
        bestWin
        worstLoss
        followers
      }
    }
  }
`;

/**
 * Get a single strategy by ID
 */
export const GET_STRATEGY = `
  query GetStrategy($id: Int!) {
    strategy(id: $id) {
      id
      name
      description
      marketKind
      creatorWallet
      creatorName
      isPublic
      createdAt
      stats {
        totalSignals
        wins
        losses
        winRate
        totalPnl
        bestWin
        worstLoss
        followers
      }
    }
  }
`;

/**
 * Get signals for a strategy
 */
export const GET_SIGNALS = `
  query GetSignals($strategyId: Int!, $status: String) {
    signals(strategyId: $strategyId, status: $status) {
      id
      strategyId
      market
      direction
      entryPrice
      targetPrice
      exitPrice
      status
      pnlPercent
      confidence
      reasoning
      createdAt
      resolvedAt
    }
  }
`;

/**
 * Get live feed of recent signals
 */
export const GET_LIVE_FEED = `
  query GetLiveFeed($limit: Int) {
    liveFeed(limit: $limit) {
      id
      strategyId
      strategyName
      market
      direction
      entryPrice
      targetPrice
      exitPrice
      status
      pnlPercent
      confidence
      createdAt
    }
  }
`;

/**
 * Get top strategies leaderboard
 */
export const GET_LEADERBOARD = `
  query GetLeaderboard($sortBy: String, $limit: Int) {
    leaderboard(sortBy: $sortBy, limit: $limit) {
      rank
      strategyId
      strategyName
      creatorWallet
      creatorName
      marketKind
      winRate
      totalPnl
      totalSignals
      followers
    }
  }
`;

/**
 * Check if user follows a strategy
 */
export const CHECK_FOLLOWING = `
  query CheckFollowing($wallet: String!, $strategyId: Int!) {
    isFollowing(wallet: $wallet, strategyId: $strategyId)
  }
`;

/**
 * Get user's followed strategies
 */
export const GET_FOLLOWED_STRATEGIES = `
  query GetFollowedStrategies($wallet: String!) {
    followedStrategies(wallet: $wallet) {
      id
      name
      description
      marketKind
      creatorName
      stats {
        winRate
        totalPnl
        totalSignals
      }
    }
  }
`;

// ============================================================================
// GraphQL Mutation Definitions (matching actual contract schema)
// ============================================================================

/**
 * Register as a strategist (on-chain)
 * Contract: RegisterStrategist { display_name: String }
 */
export const REGISTER_STRATEGIST = `
  mutation RegisterStrategist($displayName: String!) {
    registerStrategist(displayName: $displayName)
  }
`;

/**
 * Create a new strategy (on-chain)
 * Contract: CreateAgentStrategy { name, description, market_kind, base_market, is_public, is_ai_controlled }
 * Note: MarketKind enum uses SCREAMING_CASE in GraphQL: CRYPTO, SPORTS, PREDICTION_APP
 */
export const CREATE_STRATEGY = `
  mutation CreateAgentStrategy(
    $name: String!,
    $description: String!,
    $marketKind: MarketKind!,
    $baseMarket: String!,
    $isPublic: Boolean!,
    $isAiControlled: Boolean!
  ) {
    createAgentStrategy(
      name: $name,
      description: $description,
      marketKind: $marketKind,
      baseMarket: $baseMarket,
      isPublic: $isPublic,
      isAiControlled: $isAiControlled
    )
  }
`;

/**
 * Publish a trading signal (on-chain)
 * Contract: PublishSignal { strategy_id, direction, horizon_secs, confidence_bps, entry_value }
 */
export const PUBLISH_SIGNAL = `
  mutation PublishSignal(
    $strategyId: Int!,
    $direction: Direction!,
    $horizonSecs: Int!,
    $confidenceBps: Int!,
    $entryValue: Int
  ) {
    publishSignal(
      strategyId: $strategyId,
      direction: $direction,
      horizonSecs: $horizonSecs,
      confidenceBps: $confidenceBps,
      entryValue: $entryValue
    )
  }
`;

/**
 * Resolve a signal with outcome (on-chain)
 * Contract: ResolveSignal { signal_id, resolved_value }
 */
export const RESOLVE_SIGNAL = `
  mutation ResolveSignal($signalId: Int!, $resolvedValue: Int!) {
    resolveSignal(signalId: $signalId, resolvedValue: $resolvedValue)
  }
`;

/**
 * Follow a strategy (on-chain)
 * Contract: FollowStrategy { strategy_id, auto_copy, max_exposure_units }
 */
export const FOLLOW_STRATEGY = `
  mutation FollowStrategy($strategyId: Int!, $autoCopy: Boolean!, $maxExposureUnits: Int!) {
    followStrategy(strategyId: $strategyId, autoCopy: $autoCopy, maxExposureUnits: $maxExposureUnits)
  }
`;

/**
 * Unfollow a strategy (on-chain)
 * Contract: UnfollowStrategy { strategy_id }
 */
export const UNFOLLOW_STRATEGY = `
  mutation UnfollowStrategy($strategyId: Int!) {
    unfollowStrategy(strategyId: $strategyId)
  }
`;

// NOTE: UpdateStrategist and UpdateStrategy don't exist in contract
// These operations are not available on-chain

// ============================================================================
// Type-safe Operation Functions
// ============================================================================

export interface Strategist {
  wallet: string;
  name: string;
  bio?: string;
  registeredAt: string;
  totalStrategies: number;
  totalSignals: number;
  totalFollowers: number;
}

export interface StrategyStats {
  totalSignals: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  bestWin: number;
  worstLoss: number;
  followers: number;
}

export interface Strategy {
  id: number;
  name: string;
  description: string;
  marketKind: string;
  creatorWallet: string;
  creatorName?: string;
  isPublic: boolean;
  createdAt: string;
  stats: StrategyStats;
}

export interface Signal {
  id: number;
  strategyId: number;
  strategyName?: string;
  market: string;
  direction: string;
  entryPrice: number;
  targetPrice?: number;
  exitPrice?: number;
  status: string;
  pnlPercent?: number;
  confidence?: number;
  reasoning?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface LeaderboardEntry {
  rank: number;
  strategyId: number;
  strategyName: string;
  creatorWallet: string;
  creatorName?: string;
  marketKind: string;
  winRate: number;
  totalPnl: number;
  totalSignals: number;
  followers: number;
}

// ============================================================================
// On-Chain API Functions (these require wallet signing)
// ============================================================================

export const onChainApi = {
  // Queries (read-only)
  async getStrategist(wallet: string): Promise<Strategist | null> {
    await ensureAppConnected();
    const result = await chainQuery<{ strategist: Strategist | null }>(GET_STRATEGIST, { wallet });
    return result.strategist;
  },

  async getStrategies(filters?: { marketKind?: string; isPublic?: boolean; limit?: number }): Promise<Strategy[]> {
    await ensureAppConnected();
    const result = await chainQuery<{ strategies: Strategy[] }>(GET_STRATEGIES, filters || {});
    return result.strategies;
  },

  async getStrategy(id: number): Promise<Strategy | null> {
    await ensureAppConnected();
    const result = await chainQuery<{ strategy: Strategy | null }>(GET_STRATEGY, { id });
    return result.strategy;
  },

  async getSignals(strategyId: number, status?: string): Promise<Signal[]> {
    await ensureAppConnected();
    const result = await chainQuery<{ signals: Signal[] }>(GET_SIGNALS, { strategyId, status });
    return result.signals;
  },

  async getLiveFeed(limit?: number): Promise<Signal[]> {
    await ensureAppConnected();
    const result = await chainQuery<{ liveFeed: Signal[] }>(GET_LIVE_FEED, { limit: limit || 50 });
    return result.liveFeed;
  },

  async getLeaderboard(sortBy?: string, limit?: number): Promise<LeaderboardEntry[]> {
    await ensureAppConnected();
    const result = await chainQuery<{ leaderboard: LeaderboardEntry[] }>(GET_LEADERBOARD, { sortBy, limit });
    return result.leaderboard;
  },

  async isFollowing(wallet: string, strategyId: number): Promise<boolean> {
    await ensureAppConnected();
    const result = await chainQuery<{ isFollowing: boolean }>(CHECK_FOLLOWING, { wallet, strategyId });
    return result.isFollowing;
  },

  async getFollowedStrategies(wallet: string): Promise<Strategy[]> {
    await ensureAppConnected();
    const result = await chainQuery<{ followedStrategies: Strategy[] }>(GET_FOLLOWED_STRATEGIES, { wallet });
    return result.followedStrategies;
  },

  // Mutations (require wallet signature - these actually write to blockchain)
  // These match the actual contract Operation enum
  
  async registerStrategist(displayName: string): Promise<boolean> {
    await ensureAppConnected();
    console.log('🔗 Calling ON-CHAIN registerStrategist mutation...');
    const result = await chainMutate<{ registerStrategist: boolean }>(REGISTER_STRATEGIST, { displayName });
    console.log('✅ ON-CHAIN registerStrategist result:', result);
    return result.registerStrategist;
  },

  async createStrategy(data: { 
    name: string; 
    description: string; 
    marketKind: string;  // "Crypto" | "Sports" | "PredictionApp"
    baseMarket: string;  // e.g., "BTC/USD", "ETH/USD"
    isPublic: boolean;
    isAiControlled: boolean;
  }): Promise<number> {
    await ensureAppConnected();
    
    // Convert marketKind to GraphQL enum format (SCREAMING_CASE)
    // async-graphql uses rename_all = "SCREAMING_SNAKE_CASE" by default for enums
    const marketKindMap: Record<string, string> = {
      'Crypto': 'CRYPTO',
      'Sports': 'SPORTS', 
      'PredictionApp': 'PREDICTION_APP',
    };
    
    const graphqlData = {
      ...data,
      marketKind: marketKindMap[data.marketKind] || data.marketKind.toUpperCase(),
    };
    
    console.log('🔗 Calling ON-CHAIN createAgentStrategy mutation...', graphqlData);
    const result = await chainMutate<{ createAgentStrategy: number }>(CREATE_STRATEGY, graphqlData);
    console.log('✅ ON-CHAIN createAgentStrategy result:', result);
    return result.createAgentStrategy;
  },

  async publishSignal(data: {
    strategyId: number;
    direction: string;  // "Long" | "Short" -> "UP" | "DOWN"
    horizonSecs: number;
    confidenceBps: number;  // basis points 0-10000
    entryValue?: number;
  }): Promise<number> {
    await ensureAppConnected();
    
    // Convert direction to GraphQL enum format (SCREAMING_CASE)
    // Contract uses: Up, Down, Over, Under, Yes, No -> GraphQL: UP, DOWN, OVER, UNDER, YES, NO
    // Frontend uses: Long (bullish) = UP, Short (bearish) = DOWN
    const directionMap: Record<string, string> = {
      'Long': 'UP',
      'Short': 'DOWN',
      'Up': 'UP',
      'Down': 'DOWN',
    };
    
    const graphqlData = {
      ...data,
      direction: directionMap[data.direction] || 'UP',
    };
    
    console.log('🔗 Calling ON-CHAIN publishSignal mutation...', graphqlData);
    const result = await chainMutate<{ publishSignal: number }>(PUBLISH_SIGNAL, graphqlData);
    console.log('✅ ON-CHAIN publishSignal result:', result);
    return result.publishSignal;
  },

  async resolveSignal(signalId: number, resolvedValue: number): Promise<boolean> {
    await ensureAppConnected();
    console.log('🔗 Calling ON-CHAIN resolveSignal mutation...');
    const result = await chainMutate<{ resolveSignal: boolean }>(RESOLVE_SIGNAL, { signalId, resolvedValue });
    return result.resolveSignal;
  },

  async followStrategy(strategyId: number, autoCopy: boolean = false, maxExposureUnits: number = 0): Promise<boolean> {
    await ensureAppConnected();
    console.log('🔗 Calling ON-CHAIN followStrategy mutation...');
    const result = await chainMutate<{ followStrategy: boolean }>(FOLLOW_STRATEGY, { strategyId, autoCopy, maxExposureUnits });
    return result.followStrategy;
  },

  async unfollowStrategy(strategyId: number): Promise<boolean> {
    await ensureAppConnected();
    console.log('🔗 Calling ON-CHAIN unfollowStrategy mutation...');
    const result = await chainMutate<{ unfollowStrategy: boolean }>(UNFOLLOW_STRATEGY, { strategyId });
    return result.unfollowStrategy;
  },
  
  // Note: updateStrategist and updateStrategy are not available on-chain
  // These operations would need to be added to the contract if needed
};
