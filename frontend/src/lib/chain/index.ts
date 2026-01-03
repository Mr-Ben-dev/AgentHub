// ============================================================================
// Chain Module - Barrel export for all chain-related functionality
// ============================================================================

// WASM initialization
export { ensureChainInitialized, isChainInitialized, getLineraClient } from './init';

// Wallet signer adapter
export { createChainSigner, EvmChainSigner } from './signer';

// Re-export Signer type from @linera/client
export type { Signer } from '@linera/client';

// Connection management
export {
  chainManager,
  connectChain,
  connectApp,
  chainQuery,
  chainMutate,
  disconnectChain,
} from './connection';

// GraphQL operations and types
export {
  // Query strings
  GET_STRATEGIST,
  GET_STRATEGIES,
  GET_STRATEGY,
  GET_SIGNALS,
  GET_LIVE_FEED,
  GET_LEADERBOARD,
  CHECK_FOLLOWING,
  GET_FOLLOWED_STRATEGIES,
  // Mutation strings
  REGISTER_STRATEGIST,
  CREATE_STRATEGY,
  PUBLISH_SIGNAL,
  RESOLVE_SIGNAL,
  FOLLOW_STRATEGY,
  UNFOLLOW_STRATEGY,
  // Type-safe API
  onChainApi,
} from './operations';

export type {
  Strategist,
  Strategy,
  StrategyStats,
  Signal,
  LeaderboardEntry,
} from './operations';

// React hooks
export { useChain, useChainReady, useChainStatus } from './useChain';
export type { ChainState, UseChainReturn } from './useChain';
