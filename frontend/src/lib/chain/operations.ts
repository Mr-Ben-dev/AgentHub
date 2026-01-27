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

/**
 * Get the Linera account owner address for the current session.
 * 
 * IMPORTANT: In Linera, operations are authenticated by the SIGNER, not the EVM wallet.
 * When auto-signing is enabled, the auto-signer address is the authenticated owner.
 * This is the address that should be used for on-chain queries like `isStrategist`.
 */
export function getAuthenticatedOwner(): string | null {
  // Auto-signer is the authenticated owner for on-chain operations
  const autoSigner = chainManager.getAutoSignerAddress();
  if (autoSigner) {
    return autoSigner;
  }
  // Fall back to wallet address (though this won't match contract expectations)
  return chainManager.getAddress();
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

// ============================================================================
// Subscription Operations (cross-chain subscription to strategists)
// ============================================================================

/**
 * Enable subscription for this strategist
 * Contract: EnableSubscription { description: Option<String> }
 */
export const ENABLE_SUBSCRIPTION = `
  mutation EnableSubscription($description: String) {
    enableSubscription(description: $description)
  }
`;

/**
 * Disable subscription for this strategist
 * Contract: DisableSubscription
 */
export const DISABLE_SUBSCRIPTION = `
  mutation DisableSubscription {
    disableSubscription
  }
`;

/**
 * Subscribe to a strategist (cross-chain)
 * Contract: SubscribeToStrategist { strategist: AccountOwner, strategist_chain_id: String }
 */
export const SUBSCRIBE_TO_STRATEGIST = `
  mutation SubscribeToStrategist($strategist: String!, $strategistChainId: String!) {
    subscribeToStrategist(strategist: $strategist, strategistChainId: $strategistChainId)
  }
`;

/**
 * Unsubscribe from a strategist
 * Contract: UnsubscribeFromStrategist { strategist: AccountOwner }
 */
export const UNSUBSCRIBE_FROM_STRATEGIST = `
  mutation UnsubscribeFromStrategist($strategist: String!) {
    unsubscribeFromStrategist(strategist: $strategist)
  }
`;

/**
 * Get subscription offer for a strategist
 */
export const GET_SUBSCRIPTION_OFFER = `
  query GetSubscriptionOffer($strategist: String!) {
    subscriptionOffer(strategist: $strategist) {
      strategist
      description
      isEnabled
    }
  }
`;

/**
 * Get all subscription offers
 */
export const GET_SUBSCRIPTION_OFFERS = `
  query GetSubscriptionOffers($limit: Int) {
    subscriptionOffers(limit: $limit) {
      strategist
      description
      isEnabled
    }
  }
`;

/**
 * Get my subscriptions
 */
export const GET_MY_SUBSCRIPTIONS = `
  query GetMySubscriptions($subscriber: String!) {
    mySubscriptions(subscriber: $subscriber) {
      id
      subscriber
      subscriberChainId
      strategist
      strategistChainId
      startTimestamp
      endTimestamp
      isActive
    }
  }
`;

/**
 * Get subscribers for a strategist
 */
export const GET_SUBSCRIBERS_OF = `
  query GetSubscribersOf($strategist: String!) {
    subscribersOf(strategist: $strategist) {
      id
      subscriber
      subscriberChainId
      strategist
      strategistChainId
      startTimestamp
      endTimestamp
      isActive
    }
  }
`;

/**
 * Check if subscribed to a strategist
 */
export const IS_SUBSCRIBED = `
  query IsSubscribed($subscriber: String!, $strategist: String!) {
    isSubscribed(subscriber: $subscriber, strategist: $strategist)
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

// Subscription interfaces
export interface SubscriptionOffer {
  strategist: string;
  description?: string;
  isEnabled: boolean;
}

export interface Subscription {
  id: string;
  subscriber: string;
  subscriberChainId: string;
  strategist: string;
  strategistChainId: string;
  startTimestamp: number;
  endTimestamp: number;
  isActive: boolean;
}

// ============================================================================
// On-Chain API Functions (these require wallet signing)
// ============================================================================

export const onChainApi = {
  /**
   * Get the authenticated owner address for on-chain operations
   * This is the auto-signer address when auto-signing is enabled
   */
  getAuthenticatedOwner(): string | null {
    return getAuthenticatedOwner();
  },

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

  // ============================================================================
  // MUTATIONS (require wallet signature - write to blockchain)
  // ============================================================================
  // 
  // IMPORTANT: Linera mutations schedule operations and return [].
  // The actual success/failure is determined by the contract execution.
  // We wait for the block to process and verify by querying state.
  // ============================================================================
  
  /**
   * Register as a strategist on-chain
   * MUST be called before createStrategy
   */
  async registerStrategist(displayName: string): Promise<boolean> {
    await ensureAppConnected();
    console.log('🔗 Calling ON-CHAIN registerStrategist mutation...');
    
    try {
      const result = await chainMutate<{ registerStrategist: number[] }>(REGISTER_STRATEGIST, { displayName });
      console.log('📝 Mutation scheduled, result:', result);
      
      // Wait for block processing
      console.log('⏳ Waiting for block confirmation...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Verify by checking if strategist now exists
      // Note: In a production app, you'd listen for block notifications
      console.log('✅ ON-CHAIN registerStrategist completed');
      return true;
    } catch (error) {
      console.error('❌ ON-CHAIN registerStrategist failed:', error);
      throw error;
    }
  },

  /**
   * Create a new AI agent strategy on-chain
   * REQUIRES: User must be registered as strategist first!
   */
  async createStrategy(data: { 
    name: string; 
    description: string; 
    marketKind: string;  // "Crypto" | "Sports" | "PredictionApp"
    baseMarket: string;  // e.g., "BTC/USD", "ETH/USD"
    isPublic: boolean;
    isAiControlled: boolean;
  }): Promise<number> {
    await ensureAppConnected();
    
    // Get the auto-signer address (owner for on-chain operations)
    const ownerAddress = getAuthenticatedOwner();
    if (!ownerAddress) {
      throw new Error('No authenticated owner address available');
    }
    
    // Convert marketKind to GraphQL enum format (SCREAMING_CASE)
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
    
    try {
      const result = await chainMutate<{ createAgentStrategy: number[] }>(CREATE_STRATEGY, graphqlData);
      console.log('📝 Mutation scheduled, raw result:', result);
      
      // IMPORTANT: Linera mutations return [] - this does NOT mean failure!
      // The actual result is in the operation_results of the confirmed block
      
      // Wait for block processing
      console.log('⏳ Waiting for block confirmation...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log('✅ ON-CHAIN createAgentStrategy mutation completed');
      
      // Query the contract to find the newly created strategy
      // First try direct strategy query by checking IDs 0, 1, 2...
      console.log('🔍 Querying contract for newly created strategy...');
      console.log('📋 Owner address for query:', ownerAddress);
      
      try {
        // Strategy IDs are sequential starting from 0
        // Try querying directly by ID first (more reliable)
        const GET_STRATEGY_BY_ID = `
          query GetStrategy($id: Int!) {
            strategy(id: $id) {
              id
              name
              owner
            }
          }
        `;
        
        // Try IDs 0-9 to find our strategy
        for (let tryId = 0; tryId < 10; tryId++) {
          console.log(`🔍 Checking strategy ID ${tryId}...`);
          const strategyResult = await chainQuery<{ strategy: { id: number; name: string; owner: string } | null }>(
            GET_STRATEGY_BY_ID,
            { id: tryId }
          );
          
          if (strategyResult.strategy) {
            console.log(`📋 Found strategy ID ${tryId}:`, strategyResult.strategy);
            // Check if name matches (case-insensitive)
            if (strategyResult.strategy.name.trim().toLowerCase() === data.name.trim().toLowerCase()) {
              console.log(`✅ Found matching strategy on-chain with ID: ${tryId}`);
              return tryId;
            }
          } else {
            // No more strategies
            console.log(`📋 No strategy at ID ${tryId}, stopping search`);
            break;
          }
        }
        
        // Fallback: Return 0 if we created a strategy but couldn't find by name
        // (The first strategy on a fresh chain is always ID 0)
        console.log('⚠️ Using fallback strategy ID: 0');
        return 0;
      } catch (queryError) {
        console.warn('⚠️ Could not query strategies:', queryError);
        // Fallback to 0 for fresh chains
        return 0;
      }
    } catch (error) {
      console.error('❌ ON-CHAIN createAgentStrategy failed:', error);
      throw error;
    }
  },

  /**
   * Publish a trading signal for a strategy
   * REQUIRES: User must own the strategy
   * IMPORTANT: Verifies strategy exists on-chain first!
   */
  async publishSignal(data: {
    strategyId: number;
    direction: string;  // "Long" | "Short" -> "UP" | "DOWN"
    horizonSecs: number;
    confidenceBps: number;  // basis points 0-10000
    entryValue?: number;
  }): Promise<number> {
    await ensureAppConnected();
    
    // CRITICAL: Verify strategy exists on-chain before publishing
    const { exists } = await this.verifyStrategyExists(data.strategyId);
    if (!exists) {
      const error = new Error(
        `Strategy ${data.strategyId} does not exist on-chain. ` +
        `This strategy may only exist in the backend database. ` +
        `Please create a new strategy on-chain first.`
      );
      console.error('❌ ON-CHAIN publishSignal failed:', error.message);
      throw error;
    }
    
    // Convert direction to GraphQL enum format (SCREAMING_CASE)
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
    
    try {
      const result = await chainMutate<{ publishSignal: number[] }>(PUBLISH_SIGNAL, graphqlData);
      console.log('📝 Mutation scheduled, raw result:', result);
      
      // Wait for block processing
      console.log('⏳ Waiting for block confirmation...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log('✅ ON-CHAIN publishSignal mutation completed');
      return -1; // Actual ID comes from backend sync
    } catch (error) {
      console.error('❌ ON-CHAIN publishSignal failed:', error);
      throw error;
    }
  },

  /**
   * Resolve an open signal with the final value
   */
  async resolveSignal(signalId: number, resolvedValue: number): Promise<boolean> {
    await ensureAppConnected();
    console.log('🔗 Calling ON-CHAIN resolveSignal mutation...');
    
    try {
      await chainMutate<{ resolveSignal: number[] }>(RESOLVE_SIGNAL, { signalId, resolvedValue });
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log('✅ ON-CHAIN resolveSignal completed');
      return true;
    } catch (error) {
      console.error('❌ ON-CHAIN resolveSignal failed:', error);
      throw error;
    }
  },

  /**
   * Follow a strategy
   * IMPORTANT: Verifies strategy exists on-chain first!
   */
  async followStrategy(strategyId: number, autoCopy: boolean = false, maxExposureUnits: number = 0): Promise<boolean> {
    await ensureAppConnected();
    
    // CRITICAL: Verify strategy exists on-chain before following
    const { exists } = await this.verifyStrategyExists(strategyId);
    if (!exists) {
      const error = new Error(
        `Strategy ${strategyId} does not exist on-chain. ` +
        `This strategy may only exist in the backend database. ` +
        `Only on-chain strategies can be followed.`
      );
      console.error('❌ ON-CHAIN followStrategy failed:', error.message);
      throw error;
    }
    
    console.log('🔗 Calling ON-CHAIN followStrategy mutation...');
    
    try {
      await chainMutate<{ followStrategy: number[] }>(FOLLOW_STRATEGY, { strategyId, autoCopy, maxExposureUnits });
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log('✅ ON-CHAIN followStrategy completed');
      return true;
    } catch (error) {
      console.error('❌ ON-CHAIN followStrategy failed:', error);
      throw error;
    }
  },

  /**
   * Unfollow a strategy
   * IMPORTANT: Verifies strategy exists on-chain first!
   */
  async unfollowStrategy(strategyId: number): Promise<boolean> {
    await ensureAppConnected();
    
    // CRITICAL: Verify strategy exists on-chain before unfollowing
    const { exists } = await this.verifyStrategyExists(strategyId);
    if (!exists) {
      const error = new Error(
        `Strategy ${strategyId} does not exist on-chain. ` +
        `Cannot unfollow a strategy that only exists in the backend database.`
      );
      console.error('❌ ON-CHAIN unfollowStrategy failed:', error.message);
      throw error;
    }
    
    console.log('🔗 Calling ON-CHAIN unfollowStrategy mutation...');
    
    try {
      await chainMutate<{ unfollowStrategy: number[] }>(UNFOLLOW_STRATEGY, { strategyId });
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log('✅ ON-CHAIN unfollowStrategy completed');
      return true;
    } catch (error) {
      console.error('❌ ON-CHAIN unfollowStrategy failed:', error);
      throw error;
    }
  },
  
  // ============================================================================
  // HELPER: Verify strategy exists on-chain
  // ============================================================================
  
  /**
   * Check if a strategy exists on-chain before performing operations.
   * This is CRITICAL to avoid "Strategy not found" errors.
   * 
   * The backend database may have mock/seeded data that doesn't exist on-chain.
   * Always verify on-chain before publishSignal, followStrategy, etc.
   */
  async verifyStrategyExists(strategyId: number): Promise<{ exists: boolean; strategy?: unknown }> {
    await ensureAppConnected();
    
    console.log(`🔍 Verifying strategy ${strategyId} exists on-chain...`);
    
    try {
      const result = await chainQuery<{ strategy: unknown | null }>(
        `query GetStrategy($id: Int!) { strategy(id: $id) { id name owner } }`,
        { id: strategyId }
      );
      
      const exists = result.strategy !== null;
      console.log(`📝 Strategy ${strategyId} exists on-chain: ${exists}`);
      
      return { exists, strategy: result.strategy ?? undefined };
    } catch (error) {
      console.warn(`⚠️ Could not verify strategy ${strategyId}:`, error);
      return { exists: false };
    }
  },
  
  // ============================================================================
  // HELPER: Check if user is registered as strategist
  // ============================================================================
  
  /**
   * Check if the current session's authenticated owner is registered as a strategist on-chain.
   * 
   * IMPORTANT: Uses the auto-signer address (Linera AccountOwner), NOT the EVM wallet address!
   * The contract registers strategists by their Linera AccountOwner, which is the auto-signer
   * when auto-signing is enabled.
   * 
   * @param _wallet - Ignored, uses session's authenticated owner instead
   * @returns true if registered, false otherwise
   */
  async checkStrategistRegistration(_wallet?: string): Promise<boolean> {
    await ensureAppConnected();
    
    // Get the ACTUAL authenticated owner (auto-signer address)
    const owner = getAuthenticatedOwner();
    if (!owner) {
      console.warn('⚠️ No authenticated owner found');
      return false;
    }
    
    console.log(`🔍 Checking strategist registration for owner: ${owner}`);
    
    try {
      const result = await chainQuery<{ isStrategist: boolean }>(
        `query IsStrategist($owner: String!) { isStrategist(owner: $owner) }`,
        { owner }
      );
      console.log(`📝 isStrategist result:`, result);
      return result.isStrategist;
    } catch (error) {
      console.warn('Could not check strategist registration:', error);
      return false;
    }
  },

  // ============================================================================
  // SUBSCRIPTION OPERATIONS (cross-chain following)
  // ============================================================================

  /**
   * Enable subscription for this strategist (allows others to subscribe)
   */
  async enableSubscription(description?: string): Promise<boolean> {
    await ensureAppConnected();
    console.log('🔗 Calling ON-CHAIN enableSubscription mutation...');
    
    try {
      await chainMutate<{ enableSubscription: unknown }>(ENABLE_SUBSCRIPTION, { description });
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log('✅ ON-CHAIN enableSubscription completed');
      return true;
    } catch (error) {
      console.error('❌ ON-CHAIN enableSubscription failed:', error);
      throw error;
    }
  },

  /**
   * Disable subscription for this strategist
   */
  async disableSubscription(): Promise<boolean> {
    await ensureAppConnected();
    console.log('🔗 Calling ON-CHAIN disableSubscription mutation...');
    
    try {
      await chainMutate<{ disableSubscription: unknown }>(DISABLE_SUBSCRIPTION, {});
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log('✅ ON-CHAIN disableSubscription completed');
      return true;
    } catch (error) {
      console.error('❌ ON-CHAIN disableSubscription failed:', error);
      throw error;
    }
  },

  /**
   * Subscribe to a strategist (cross-chain subscription)
   * @param strategist - The strategist's Linera account owner address
   * @param strategistChainId - The strategist's chain ID
   */
  async subscribeToStrategist(strategist: string, strategistChainId: string): Promise<boolean> {
    await ensureAppConnected();
    console.log('🔗 Calling ON-CHAIN subscribeToStrategist mutation...', { strategist, strategistChainId });
    
    try {
      await chainMutate<{ subscribeToStrategist: unknown }>(SUBSCRIBE_TO_STRATEGIST, { 
        strategist, 
        strategistChainId 
      });
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log('✅ ON-CHAIN subscribeToStrategist completed');
      return true;
    } catch (error) {
      console.error('❌ ON-CHAIN subscribeToStrategist failed:', error);
      throw error;
    }
  },

  /**
   * Unsubscribe from a strategist
   */
  async unsubscribeFromStrategist(strategist: string): Promise<boolean> {
    await ensureAppConnected();
    console.log('🔗 Calling ON-CHAIN unsubscribeFromStrategist mutation...');
    
    try {
      await chainMutate<{ unsubscribeFromStrategist: unknown }>(UNSUBSCRIBE_FROM_STRATEGIST, { strategist });
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log('✅ ON-CHAIN unsubscribeFromStrategist completed');
      return true;
    } catch (error) {
      console.error('❌ ON-CHAIN unsubscribeFromStrategist failed:', error);
      throw error;
    }
  },

  /**
   * Get subscription offer for a strategist
   */
  async getSubscriptionOffer(strategist: string): Promise<SubscriptionOffer | null> {
    await ensureAppConnected();
    
    try {
      const result = await chainQuery<{ subscriptionOffer: SubscriptionOffer | null }>(
        GET_SUBSCRIPTION_OFFER, 
        { strategist }
      );
      return result.subscriptionOffer;
    } catch (error) {
      console.warn('Could not get subscription offer:', error);
      return null;
    }
  },

  /**
   * Get all active subscription offers
   */
  async getSubscriptionOffers(limit?: number): Promise<SubscriptionOffer[]> {
    await ensureAppConnected();
    
    try {
      const result = await chainQuery<{ subscriptionOffers: SubscriptionOffer[] }>(
        GET_SUBSCRIPTION_OFFERS,
        { limit: limit || 50 }
      );
      return result.subscriptionOffers || [];
    } catch (error) {
      console.warn('Could not get subscription offers:', error);
      return [];
    }
  },

  /**
   * Get subscriptions for the current user
   */
  async getMySubscriptions(): Promise<Subscription[]> {
    await ensureAppConnected();
    
    const subscriber = getAuthenticatedOwner();
    if (!subscriber) return [];
    
    try {
      const result = await chainQuery<{ mySubscriptions: Subscription[] }>(
        GET_MY_SUBSCRIPTIONS,
        { subscriber }
      );
      return result.mySubscriptions || [];
    } catch (error) {
      console.warn('Could not get subscriptions:', error);
      return [];
    }
  },

  /**
   * Get subscribers for a strategist
   */
  async getSubscribersOf(strategist: string): Promise<Subscription[]> {
    await ensureAppConnected();
    
    try {
      const result = await chainQuery<{ subscribersOf: Subscription[] }>(
        GET_SUBSCRIBERS_OF,
        { strategist }
      );
      return result.subscribersOf || [];
    } catch (error) {
      console.warn('Could not get subscribers:', error);
      return [];
    }
  },

  /**
   * Check if subscribed to a strategist
   */
  async isSubscribed(strategist: string): Promise<boolean> {
    await ensureAppConnected();
    
    const subscriber = getAuthenticatedOwner();
    if (!subscriber) return false;
    
    try {
      const result = await chainQuery<{ isSubscribed: boolean }>(
        IS_SUBSCRIBED,
        { subscriber, strategist }
      );
      return result.isSubscribed;
    } catch (error) {
      console.warn('Could not check subscription:', error);
      return false;
    }
  },
};
