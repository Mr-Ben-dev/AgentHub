// ============================================================================
// useAgentHub Hook - Combined API + Linera on-chain data
// ============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { api } from '@/lib/api';
import { lineraAdapter } from '@/lib/linera';

// Configuration flags
const USE_LINERA = import.meta.env.VITE_LINERA_APP_ID && import.meta.env.VITE_LINERA_CHAIN_ID;

// Initialize Linera adapter if configured
if (USE_LINERA) {
  lineraAdapter.init({
    chainId: import.meta.env.VITE_LINERA_CHAIN_ID,
    applicationId: import.meta.env.VITE_LINERA_APP_ID,
    nodeUrl: import.meta.env.VITE_LINERA_NODE_URL || 'http://localhost:8080',
  });
}

// ============================================================================
// Strategies Hook
// ============================================================================

export function useStrategies(options?: { publicOnly?: boolean }) {
  return useQuery({
    queryKey: ['strategies', options?.publicOnly ? 'public' : 'all'],
    queryFn: async () => {
      // Use backend API (which syncs with on-chain data)
      return api.getStrategies({ publicOnly: options?.publicOnly });
    },
  });
}

export function useStrategy(id: number) {
  return useQuery({
    queryKey: ['strategy', id],
    queryFn: () => api.getStrategy(id),
    enabled: id > 0,
  });
}

export function useStrategySignals(strategyId: number, status?: 'open' | 'closed') {
  return useQuery({
    queryKey: ['strategy-signals', strategyId, status],
    queryFn: () => api.getStrategySignals(strategyId, status),
    enabled: strategyId > 0,
  });
}

export function useTopStrategies(limit = 20) {
  return useQuery({
    queryKey: ['top-strategies', limit],
    queryFn: () => api.getTopStrategies(limit),
  });
}

// ============================================================================
// Signals Hook
// ============================================================================

export function useOpenSignals() {
  return useQuery({
    queryKey: ['open-signals'],
    queryFn: () => api.getOpenSignals(),
    refetchInterval: 10000, // Refresh every 10s
  });
}

export function useFeed(limit = 50) {
  return useQuery({
    queryKey: ['feed', limit],
    queryFn: () => api.getFeed(limit),
    refetchInterval: 15000,
  });
}

// ============================================================================
// User/Strategist Hook
// ============================================================================

export function useStrategist() {
  const { primaryWallet } = useDynamicContext();
  const wallet = primaryWallet?.address;

  return useQuery({
    queryKey: ['strategist', wallet],
    queryFn: () => api.getStrategist(wallet!),
    enabled: !!wallet,
  });
}

export function useMyStrategies() {
  const { primaryWallet } = useDynamicContext();
  const wallet = primaryWallet?.address;

  const { data: strategist } = useStrategist();

  return useQuery({
    queryKey: ['my-strategies', wallet],
    queryFn: () => api.getStrategies({ creatorWallet: wallet }),
    enabled: !!wallet && strategist?.isRegistered,
  });
}

// ============================================================================
// Mutations
// ============================================================================

export function useRegisterStrategist() {
  const queryClient = useQueryClient();
  const { primaryWallet } = useDynamicContext();
  const wallet = primaryWallet?.address;

  return useMutation({
    mutationFn: async (params: { name: string; bio?: string }) => {
      if (!wallet) throw new Error('Wallet not connected');

      // Submit to backend (and optionally on-chain)
      const result = await api.registerStrategist({
        wallet,
        name: params.name,
        bio: params.bio,
      });

      // If Linera is configured, also submit on-chain
      if (USE_LINERA) {
        await lineraAdapter.mutations.registerStrategist({
          name: params.name,
          bio: params.bio || '',
        });
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategist', wallet] });
    },
  });
}

export function useCreateStrategy() {
  const queryClient = useQueryClient();
  const { primaryWallet } = useDynamicContext();
  const wallet = primaryWallet?.address;

  return useMutation({
    mutationFn: async (params: {
      name: string;
      description: string;
      marketKind: string;
      isPublic: boolean;
    }) => {
      if (!wallet) throw new Error('Wallet not connected');

      // Submit to backend
      const result = await api.createStrategy({
        ...params,
        creatorWallet: wallet,
      });

      // If Linera is configured, also submit on-chain
      if (USE_LINERA) {
        await lineraAdapter.mutations.createStrategy({
          name: params.name,
          description: params.description,
          marketKind: params.marketKind as 'Crypto' | 'Sports' | 'PredictionApp',
          isPublic: params.isPublic,
        });
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
      queryClient.invalidateQueries({ queryKey: ['my-strategies', wallet] });
    },
  });
}

export function usePublishSignal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      strategyId: number;
      market: string;
      direction: string;
      entryPrice?: number;
      targetPrice?: number;
      stopLoss?: number;
      confidence: number;
      reasoning?: string;
    }) => {
      // Submit to backend (auto-fetches entry price if not provided)
      const result = await api.createSignal(params);

      // If Linera is configured, also submit on-chain
      if (USE_LINERA) {
        await lineraAdapter.mutations.publishSignal({
          strategyId: params.strategyId,
          market: params.market,
          direction: params.direction as 'Up' | 'Down',
          entryPrice: result.entryPrice,
          targetPrice: params.targetPrice,
          stopLoss: params.stopLoss,
          confidence: params.confidence,
          reasoning: params.reasoning,
        });
      }

      return result;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['strategy-signals', variables.strategyId] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['open-signals'] });
    },
  });
}

export function useFollowStrategy() {
  const queryClient = useQueryClient();
  const { primaryWallet } = useDynamicContext();
  const wallet = primaryWallet?.address;

  return useMutation({
    mutationFn: async (strategyId: number) => {
      if (!wallet) throw new Error('Wallet not connected');

      const result = await api.followStrategy(wallet, strategyId);

      if (USE_LINERA) {
        await lineraAdapter.mutations.followStrategy(strategyId);
      }

      return result;
    },
    onSuccess: (_data, strategyId) => {
      queryClient.invalidateQueries({ queryKey: ['following', wallet, strategyId] });
      queryClient.invalidateQueries({ queryKey: ['strategy', strategyId] });
    },
  });
}

export function useUnfollowStrategy() {
  const queryClient = useQueryClient();
  const { primaryWallet } = useDynamicContext();
  const wallet = primaryWallet?.address;

  return useMutation({
    mutationFn: async (strategyId: number) => {
      if (!wallet) throw new Error('Wallet not connected');

      const result = await api.unfollowStrategy(wallet, strategyId);

      if (USE_LINERA) {
        await lineraAdapter.mutations.unfollowStrategy(strategyId);
      }

      return result;
    },
    onSuccess: (_data, strategyId) => {
      queryClient.invalidateQueries({ queryKey: ['following', wallet, strategyId] });
      queryClient.invalidateQueries({ queryKey: ['strategy', strategyId] });
    },
  });
}

// ============================================================================
// Following Status Hook
// ============================================================================

export function useFollowingStatus(strategyId: number) {
  const { primaryWallet } = useDynamicContext();
  const wallet = primaryWallet?.address;

  return useQuery({
    queryKey: ['following', wallet, strategyId],
    queryFn: () => api.checkFollowing(wallet!, strategyId),
    enabled: !!wallet && strategyId > 0,
  });
}

// ============================================================================
// Prices Hook
// ============================================================================

export function usePrices() {
  return useQuery({
    queryKey: ['prices'],
    queryFn: () => api.getPrices(),
    refetchInterval: 10000,
  });
}

// ============================================================================
// Stats Hook
// ============================================================================

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: () => api.getStats(),
    refetchInterval: 30000,
  });
}
