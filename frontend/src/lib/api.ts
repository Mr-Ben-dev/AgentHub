// ============================================================================
// API Client - Real data fetching (no mocks)
// ============================================================================

const API_BASE = import.meta.env.VITE_API_URL || '';

// Transform snake_case to camelCase
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Field name mappings (backend -> frontend)
const fieldMappings: Record<string, string> = {
  ownerWallet: 'creatorWallet',
  winRateBps: 'winRate',
  totalPnlBps: 'totalPnl',
  avgPnlBps: 'avgPnl',
  bestWinBps: 'bestWin',
  worstLossBps: 'worstLoss',
  winningSignals: 'wins',
  losingSignals: 'losses',
  walletAddress: 'wallet',
  displayName: 'name',
  followersCount: 'followers',
  entryValue: 'entryPrice',
  resolvedValue: 'exitPrice',
  confidenceBps: 'confidence',
  pnlBps: 'pnlPercent',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformKeys(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(transformKeys);
  if (typeof obj !== 'object') return obj;
  
  const transformed: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    let camelKey = snakeToCamel(key);
    // Apply field mapping if exists
    if (fieldMappings[camelKey]) {
      camelKey = fieldMappings[camelKey];
    }
    // Transform _bps values to percentages (divide by 100)
    let value = transformKeys(obj[key]);
    if (key.endsWith('_bps') && typeof value === 'number') {
      value = value / 100;
    }
    // Convert price values from cents to dollars
    if ((key === 'entry_value' || key === 'resolved_value') && typeof value === 'number') {
      value = value / 100;
    }
    transformed[camelKey] = value;
  }
  return transformed;
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}/api${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  const data = await res.json();
  return transformKeys(data) as T;
}

// ============================================================================
// Types
// ============================================================================

export interface Strategist {
  id: number;
  wallet: string;
  name: string;
  bio?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface AgentStrategy {
  id: number;
  name: string;
  description: string;
  marketKind: string;
  isPublic: boolean;
  creatorId: number;
  creatorWallet: string;
  creatorName?: string;
  createdAt: string;
}

export interface Signal {
  id: number;
  strategyId: number;
  market: string;
  direction: string;
  entryPrice: number;
  targetPrice?: number;
  stopLoss?: number;
  confidence: number;
  reasoning?: string;
  status: string;
  exitPrice?: number;
  pnlPercent?: number;
  createdAt: string;
  expiresAt?: string;
  resolvedAt?: string;
  strategyName?: string;
}

export interface StrategyStats {
  strategyId: number;
  totalSignals: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  bestWin: number;
  worstLoss: number;
  currentStreak: number;
  followers: number;
}

export interface StrategyWithStats extends AgentStrategy {
  stats: StrategyStats;
}

export interface ActivityLog {
  id: number;
  action: string;
  wallet: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface Stats {
  totalStrategists: number;
  totalStrategies: number;
  totalSignals: number;
  openSignals: number;
  totalWins: number;
  totalLosses: number;
}

// ============================================================================
// API Methods
// ============================================================================

export const api = {
  // Health & Stats
  health: () => fetchApi<{ status: string; timestamp: string }>('/health'),
  getStats: () => fetchApi<Stats>('/stats'),

  // Prices
  getPrices: () => fetchApi<Record<string, number>>('/prices'),
  getPrice: (symbol: string) => fetchApi<{ symbol: string; price: number }>(`/prices/${symbol}`),

  // Strategists
  getStrategist: (wallet: string) =>
    fetchApi<{ strategist: Strategist | null; isRegistered: boolean }>(`/strategists/${wallet}`),
  registerStrategist: (data: { wallet: string; name: string; bio?: string }) =>
    fetchApi<Strategist>('/strategists', { 
      method: 'POST', 
      body: JSON.stringify({
        wallet_address: data.wallet,
        display_name: data.name,
        bio: data.bio || '',
      }) 
    }),

  // Strategies
  getStrategies: (params?: { publicOnly?: boolean; creatorWallet?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.publicOnly) searchParams.set('is_public', 'true');
    if (params?.creatorWallet) searchParams.set('owner_wallet', params.creatorWallet);
    const query = searchParams.toString();
    return fetchApi<StrategyWithStats[]>(`/strategies${query ? `?${query}` : ''}`);
  },
  getStrategy: async (id: number) => {
    const data = await fetchApi<StrategyWithStats>(`/strategies/${id}`);
    // Backend returns flat object with nested stats, restructure for frontend
    return { strategy: data, stats: data.stats };
  },
  createStrategy: (data: {
    name: string;
    description: string;
    marketKind: string;
    isPublic: boolean;
    creatorWallet: string;
  }) => fetchApi<AgentStrategy>('/strategies', { 
    method: 'POST', 
    body: JSON.stringify({
      wallet_address: data.creatorWallet,
      name: data.name,
      description: data.description,
      market_kind: data.marketKind,
      base_market: data.marketKind === 'Crypto' ? 'BTC-USD' : 'General',
      is_public: data.isPublic,
      is_ai_controlled: false,
    }) 
  }),
  getStrategySignals: (id: number, status?: string) => {
    const query = status ? `?status=${status}` : '';
    return fetchApi<Signal[]>(`/strategies/${id}/signals${query}`);
  },

  // Signals
  getOpenSignals: () => fetchApi<Signal[]>('/signals/open'),
  createSignal: (data: {
    walletAddress: string;
    strategyId: number;
    direction: string;  // 'Up' | 'Down' | 'Over' | 'Under' | 'Yes' | 'No'
    horizonSecs: number;
    confidenceBps: number;  // 0-10000
    entryValue?: number;
  }) => fetchApi<Signal>('/signals', { 
    method: 'POST', 
    body: JSON.stringify({
      wallet_address: data.walletAddress,
      strategy_id: data.strategyId,
      direction: data.direction,
      horizon_secs: data.horizonSecs,
      confidence_bps: data.confidenceBps,
      entry_value: data.entryValue,
    })
  }),

  // Feed
  getFeed: (limit?: number) => fetchApi<Signal[]>(`/feed${limit ? `?limit=${limit}` : ''}`),

  // Rankings
  getTopStrategies: (limit?: number) =>
    fetchApi<StrategyWithStats[]>(`/rankings/top${limit ? `?limit=${limit}` : ''}`),

  // Following
  followStrategy: (wallet: string, strategyId: number) =>
    fetchApi<{ success: boolean }>('/follow', {
      method: 'POST',
      body: JSON.stringify({ wallet_address: wallet, strategy_id: strategyId }),
    }),
  unfollowStrategy: (wallet: string, strategyId: number) =>
    fetchApi<{ success: boolean }>('/follow', {
      method: 'DELETE',
      body: JSON.stringify({ wallet_address: wallet, strategy_id: strategyId }),
    }),
  checkFollowing: (wallet: string, strategyId: number) =>
    fetchApi<{ isFollowing: boolean }>(`/follow/check?wallet_address=${wallet}&strategy_id=${strategyId}`),

  // Activity
  getActivity: (limit?: number) =>
    fetchApi<ActivityLog[]>(`/activity${limit ? `?limit=${limit}` : ''}`),
  getWalletActivity: (wallet: string) => fetchApi<ActivityLog[]>(`/activity/${wallet}`),
};
