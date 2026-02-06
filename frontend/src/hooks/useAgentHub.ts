// ============================================================================
// useAgentHub Hook - Combined API + Linera on-chain data
// ============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { api } from '@/lib/api';
import { lineraAdapter } from '@/lib/linera';
import { onChainApi, chainManager } from '@/lib/chain';

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

      // 1. ON-CHAIN FIRST (primary - register on Linera blockchain)
      if (chainManager.isConnected()) {
        await onChainApi.registerStrategist(params.name);
        console.log('✅ Registered strategist on-chain');
      } else if (USE_LINERA) {
        await lineraAdapter.mutations.registerStrategist({
          name: params.name,
          bio: params.bio || '',
        });
      }

      // 2. Backend cache sync (for fast reads)
      const result = await api.registerStrategist({
        wallet,
        name: params.name,
        bio: params.bio,
      });

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

      // 1. ON-CHAIN FIRST (primary - create on Linera blockchain)
      let onchainId: number | undefined;
      if (chainManager.isConnected()) {
        try {
          onchainId = await onChainApi.createStrategy({
            name: params.name,
            description: params.description,
            marketKind: params.marketKind,
            baseMarket: params.marketKind === 'Crypto' ? 'BTC-USD' : 'General',
            isPublic: params.isPublic,
            isAiControlled: false,
          });
          console.log('✅ Strategy created on-chain, ID:', onchainId);
        } catch (e) {
          console.error('On-chain strategy creation failed:', e);
        }
      } else if (USE_LINERA) {
        await lineraAdapter.mutations.createStrategy({
          name: params.name,
          description: params.description,
          marketKind: params.marketKind as 'Crypto' | 'Sports' | 'PredictionApp',
          isPublic: params.isPublic,
        });
      }

      // 2. Backend cache sync (for fast reads)
      const result = await api.createStrategy({
        ...params,
        creatorWallet: wallet,
      });

      // 3. Link backend strategy to on-chain ID
      if (onchainId !== undefined && result.id) {
        try {
          await api.linkStrategyOnchain(result.id, onchainId);
          console.log('✅ Backend strategy linked to on-chain ID:', onchainId);
        } catch (e) {
          console.warn('Failed to link on-chain ID:', e);
        }
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
  const { primaryWallet } = useDynamicContext();

  return useMutation({
    mutationFn: async (params: {
      strategyId: number;
      direction: string;
      horizonSecs: number;
      confidenceBps: number;
      entryValue?: number;
    }) => {
      const walletAddress = primaryWallet?.address;
      if (!walletAddress) throw new Error('Wallet not connected');
      
      // Submit to backend
      const result = await api.createSignal({
        walletAddress,
        strategyId: params.strategyId,
        direction: params.direction,
        horizonSecs: params.horizonSecs,
        confidenceBps: params.confidenceBps,
        entryValue: params.entryValue,
      });

      // If Linera is configured, log it
      if (USE_LINERA) {
        console.log('Signal created on backend, on-chain publishing done separately');
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
    mutationFn: async (params: { strategyId: number; strategistId: string }) => {
      if (!wallet) throw new Error('Wallet not connected');
      if (!params.strategistId) throw new Error('Strategist identity required');

      // 100% ON-CHAIN: Cross-chain subscription (source of truth)
      if (!chainManager.isConnected()) {
        throw new Error('Must be connected to Linera chain to follow');
      }
      
      const strategistChainId = import.meta.env.VITE_LINERA_CHAIN_ID || '';
      await onChainApi.subscribeToStrategist(params.strategistId, strategistChainId);
      console.log('✅ On-chain subscription confirmed');

      // Also follow by strategy ID if possible
      try {
        await onChainApi.followStrategy(params.strategyId);
        console.log('✅ On-chain followStrategy completed');
      } catch (e) {
        console.warn('followStrategy by ID (non-critical):', e);
      }

      return { success: true };
    },
    onSuccess: (_data, params) => {
      queryClient.invalidateQueries({ queryKey: ['following', wallet, params.strategyId] });
      queryClient.invalidateQueries({ queryKey: ['strategy', params.strategyId] });
    },
  });
}

export function useUnfollowStrategy() {
  const queryClient = useQueryClient();
  const { primaryWallet } = useDynamicContext();
  const wallet = primaryWallet?.address;

  return useMutation({
    mutationFn: async (params: { strategyId: number; strategistId: string }) => {
      if (!wallet) throw new Error('Wallet not connected');
      if (!params.strategistId) throw new Error('Strategist identity required');

      // 100% ON-CHAIN: Cross-chain unsubscription (source of truth)
      if (!chainManager.isConnected()) {
        throw new Error('Must be connected to Linera chain to unfollow');
      }
      
      await onChainApi.unsubscribeFromStrategist(params.strategistId);
      console.log('✅ On-chain unsubscription confirmed');

      // Also unfollow by strategy ID if possible
      try {
        await onChainApi.unfollowStrategy(params.strategyId);
        console.log('✅ On-chain unfollowStrategy completed');
      } catch (e) {
        console.warn('unfollowStrategy by ID (non-critical):', e);
      }

      return { success: true };
    },
    onSuccess: (_data, params) => {
      queryClient.invalidateQueries({ queryKey: ['following', wallet, params.strategyId] });
      queryClient.invalidateQueries({ queryKey: ['strategy', params.strategyId] });
    },
  });
}

// ============================================================================
// Following Status Hook
// ============================================================================

export function useFollowingStatus(strategyId: number, strategistId?: string) {
  const { primaryWallet } = useDynamicContext();
  const wallet = primaryWallet?.address;

  return useQuery({
    queryKey: ['following', wallet, strategyId, strategistId],
    queryFn: async () => {
      if (!wallet) return { isFollowing: false };

      // PRIMARY: Check on-chain subscription status when connected
      if (chainManager.isConnected()) {
        // Check cross-chain subscription (most reliable)
        if (strategistId) {
          try {
            const isSubscribed = await onChainApi.isSubscribed(strategistId);
            console.log('🔗 On-chain subscription status:', isSubscribed);
            if (isSubscribed) return { isFollowing: true };
          } catch (e) {
            console.warn('On-chain subscription check failed:', e);
          }
        }
        
        // Also check by strategy ID
        try {
          const isFollowing = await onChainApi.isFollowing(wallet, strategyId);
          console.log('🔗 On-chain follow status:', isFollowing);
          if (isFollowing) return { isFollowing: true };
        } catch (e) {
          console.warn('On-chain follow check failed:', e);
        }
      }

      // FALLBACK: Backend cache
      return api.checkFollowing(wallet, strategyId);
    },
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
