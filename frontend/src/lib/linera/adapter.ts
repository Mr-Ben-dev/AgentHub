// ============================================================================
// Linera Adapter - Communication with Linera chain & application
// ============================================================================

import type {
  LineraOperation,
  PublicStrategiesResponse,
  StrategyResponse,
  StrategySignalsResponse,
  TopStrategiesResponse,
  OpenSignalsResponse,
  RecentSignalsResponse,
  MyStrategiesResponse,
  IsStrategistResponse,
} from './types';

import {
  PUBLIC_STRATEGIES_QUERY,
  STRATEGY_QUERY,
  STRATEGY_SIGNALS_QUERY,
  TOP_STRATEGIES_QUERY,
  OPEN_SIGNALS_QUERY,
  RECENT_SIGNALS_QUERY,
  MY_STRATEGIES_QUERY,
  IS_STRATEGIST_QUERY,
} from './queries';

// ============================================================================
// Configuration
// ============================================================================

interface LineraConfig {
  chainId: string;
  applicationId: string;
  nodeUrl: string;
}

let config: LineraConfig | null = null;

export function initLineraAdapter(cfg: LineraConfig) {
  config = cfg;
  console.log('🔗 Linera adapter initialized:', {
    chainId: cfg.chainId.slice(0, 8) + '...',
    applicationId: cfg.applicationId.slice(0, 8) + '...',
  });
}

function getConfig(): LineraConfig {
  if (!config) {
    throw new Error('Linera adapter not initialized. Call initLineraAdapter first.');
  }
  return config;
}

// ============================================================================
// GraphQL Query Helper
// ============================================================================

async function queryLinera<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const cfg = getConfig();
  
  // Linera GraphQL endpoint format:
  // {nodeUrl}/chains/{chainId}/applications/{applicationId}
  const url = `${cfg.nodeUrl}/chains/${cfg.chainId}/applications/${cfg.applicationId}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    throw new Error(`Linera query failed: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();

  if (result.errors) {
    throw new Error(`GraphQL error: ${result.errors.map((e: { message: string }) => e.message).join(', ')}`);
  }

  return result.data as T;
}

// ============================================================================
// Operation Submission Helper
// ============================================================================

async function submitOperation(operation: LineraOperation): Promise<string> {
  const cfg = getConfig();

  // Linera operation submission endpoint
  const url = `${cfg.nodeUrl}/chains/${cfg.chainId}/applications/${cfg.applicationId}/operations`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(operation),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Operation submission failed: ${response.status} - ${error}`);
  }

  const result = await response.json();
  return result.certificateHash || result.hash || 'submitted';
}

// ============================================================================
// Query Methods
// ============================================================================

export const lineraQueries = {
  // Get all public strategies
  getPublicStrategies: async (limit?: number) => {
    const data = await queryLinera<PublicStrategiesResponse>(PUBLIC_STRATEGIES_QUERY, { limit });
    return data.publicStrategies;
  },

  // Get single strategy
  getStrategy: async (id: number) => {
    const data = await queryLinera<StrategyResponse>(STRATEGY_QUERY, { id });
    return data.strategy;
  },

  // Get signals for a strategy
  getStrategySignals: async (strategyId: number, status?: string, limit?: number) => {
    const data = await queryLinera<StrategySignalsResponse>(STRATEGY_SIGNALS_QUERY, {
      strategyId,
      status,
      limit,
    });
    return data.strategySignals;
  },

  // Get top strategies by performance
  getTopStrategies: async (limit?: number) => {
    const data = await queryLinera<TopStrategiesResponse>(TOP_STRATEGIES_QUERY, { limit });
    return data.topStrategies;
  },

  // Get all open signals
  getOpenSignals: async (limit?: number) => {
    const data = await queryLinera<OpenSignalsResponse>(OPEN_SIGNALS_QUERY, { limit });
    return data.openSignals;
  },

  // Get recent signals (all statuses)
  getRecentSignals: async (limit?: number) => {
    const data = await queryLinera<RecentSignalsResponse>(RECENT_SIGNALS_QUERY, { limit });
    return data.recentSignals;
  },

  // Get strategies owned by a wallet
  getMyStrategies: async (wallet: string) => {
    const data = await queryLinera<MyStrategiesResponse>(MY_STRATEGIES_QUERY, { wallet });
    return data.myStrategies;
  },

  // Check if wallet is registered as strategist
  isStrategist: async (wallet: string) => {
    const data = await queryLinera<IsStrategistResponse>(IS_STRATEGIST_QUERY, { wallet });
    return data.isStrategist;
  },
};

// ============================================================================
// Mutation Methods (Operation Submission)
// ============================================================================

export const lineraMutations = {
  // Register as a strategist
  registerStrategist: async (params: { name: string; bio: string; avatarUrl?: string }) => {
    return submitOperation({
      RegisterStrategist: {
        name: params.name,
        bio: params.bio,
        avatar_url: params.avatarUrl || '',
      },
    });
  },

  // Create a new strategy
  createStrategy: async (params: {
    name: string;
    description: string;
    marketKind: 'Crypto' | 'Sports' | 'PredictionApp';
    isPublic: boolean;
  }) => {
    return submitOperation({
      CreateAgentStrategy: {
        name: params.name,
        description: params.description,
        market_kind: params.marketKind,
        is_public: params.isPublic,
      },
    });
  },

  // Publish a signal
  publishSignal: async (params: {
    strategyId: number;
    market: string;
    direction: 'Up' | 'Down' | 'Over' | 'Under' | 'Yes' | 'No';
    entryPrice: number;
    targetPrice?: number;
    stopLoss?: number;
    confidence: number;
    reasoning?: string;
    expiresAt?: number;
  }) => {
    return submitOperation({
      PublishSignal: {
        strategy_id: params.strategyId,
        market: params.market,
        direction: params.direction,
        entry_price: params.entryPrice,
        target_price: params.targetPrice ?? null,
        stop_loss: params.stopLoss ?? null,
        confidence: params.confidence,
        reasoning: params.reasoning || '',
        expires_at: params.expiresAt ?? null,
      },
    });
  },

  // Resolve a signal with exit price
  resolveSignal: async (signalId: number, exitPrice: number) => {
    return submitOperation({
      ResolveSignal: {
        signal_id: signalId,
        exit_price: exitPrice,
      },
    });
  },

  // Cancel a signal
  cancelSignal: async (signalId: number) => {
    return submitOperation({
      CancelSignal: {
        signal_id: signalId,
      },
    });
  },

  // Follow a strategy
  followStrategy: async (strategyId: number) => {
    return submitOperation({
      FollowStrategy: {
        strategy_id: strategyId,
      },
    });
  },

  // Unfollow a strategy
  unfollowStrategy: async (strategyId: number) => {
    return submitOperation({
      UnfollowStrategy: {
        strategy_id: strategyId,
      },
    });
  },
};

// ============================================================================
// Export combined adapter
// ============================================================================

export const lineraAdapter = {
  init: initLineraAdapter,
  queries: lineraQueries,
  mutations: lineraMutations,
};

export default lineraAdapter;
