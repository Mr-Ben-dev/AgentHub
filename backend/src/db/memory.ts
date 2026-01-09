// ============================================================================
// AgentHub Backend - In-Memory Database
// Mirrors PostgreSQL interface for local development
// Saves data to file every 30 seconds for persistence across restarts
// ============================================================================

import fs from 'fs';
import path from 'path';
import {
  Database,
  Strategist,
  AgentStrategy,
  Signal,
  StrategyStats,
  Follower,
  ActivityLog,
  StrategyWithStats,
  CreateStrategistInput,
  CreateStrategyInput,
  CreateSignalInput,
  ResolveSignalInput,
  FollowStrategyInput,
  LogActivityInput,
  Direction,
  SignalResult,
} from '../types';

// Data file path
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'agenthub-data.json');

// In-memory storage
let strategists: Map<string, Strategist> = new Map();
let strategies: Map<number, AgentStrategy> = new Map();
let signals: Map<number, Signal> = new Map();
let strategyStats: Map<number, StrategyStats> = new Map();
let followers: Map<string, Follower> = new Map(); // key: `${strategyId}-${wallet}`
let activityLogs: ActivityLog[] = [];

// Counters
let nextStrategistId = 1;
let nextStrategyId = 1;
let nextSignalId = 1;
let nextFollowerId = 1;
let nextActivityId = 1;

// ============================================================================
// Persistence
// ============================================================================

function saveData(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    const data = {
      strategists: Array.from(strategists.entries()),
      strategies: Array.from(strategies.entries()),
      signals: Array.from(signals.entries()),
      strategyStats: Array.from(strategyStats.entries()),
      followers: Array.from(followers.entries()),
      activityLogs,
      counters: {
        nextStrategistId,
        nextStrategyId,
        nextSignalId,
        nextFollowerId,
        nextActivityId,
      },
    };

    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    console.log('💾 Data saved to file');
  } catch (error) {
    console.error('Failed to save data:', error);
  }
}

function loadData(): void {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

      strategists = new Map(data.strategists || []);
      strategies = new Map(data.strategies || []);
      signals = new Map(data.signals || []);
      strategyStats = new Map(data.strategyStats || []);
      followers = new Map(data.followers || []);
      activityLogs = data.activityLogs || [];

      if (data.counters) {
        nextStrategistId = data.counters.nextStrategistId || 1;
        nextStrategyId = data.counters.nextStrategyId || 1;
        nextSignalId = data.counters.nextSignalId || 1;
        nextFollowerId = data.counters.nextFollowerId || 1;
        nextActivityId = data.counters.nextActivityId || 1;
      }

      // Convert date strings back to Date objects
      for (const [key, value] of strategists) {
        value.created_at = new Date(value.created_at);
      }
      for (const [key, value] of strategies) {
        value.created_at = new Date(value.created_at);
      }
      for (const [key, value] of signals) {
        value.created_at = new Date(value.created_at);
        value.expires_at = new Date(value.expires_at);
        if (value.resolved_at) value.resolved_at = new Date(value.resolved_at);
      }
      for (const [key, value] of strategyStats) {
        value.updated_at = new Date(value.updated_at);
      }
      for (const [key, value] of followers) {
        value.created_at = new Date(value.created_at);
      }
      for (const log of activityLogs) {
        log.created_at = new Date(log.created_at);
      }

      console.log('📂 Loaded data from file');
      console.log(`   - ${strategists.size} strategists`);
      console.log(`   - ${strategies.size} strategies`);
      console.log(`   - ${signals.size} signals`);
    }
  } catch (error) {
    console.error('Failed to load data:', error);
  }
}

// Load data on startup
loadData();

// Auto-save every 30 seconds
setInterval(saveData, 30000);

// ============================================================================
// Database Implementation
// ============================================================================

export const memoryDb: Database = {
  // -------------------------------------------------------------------------
  // Strategists
  // -------------------------------------------------------------------------
  async createStrategist(input: CreateStrategistInput): Promise<Strategist> {
    const wallet = input.wallet_address.toLowerCase();
    
    const strategist: Strategist = {
      id: nextStrategistId++,
      wallet_address: wallet,
      display_name: input.display_name,
      created_at: new Date(),
    };

    strategists.set(wallet, strategist);
    saveData();
    return strategist;
  },

  async getStrategist(wallet: string): Promise<Strategist | null> {
    return strategists.get(wallet.toLowerCase()) || null;
  },

  async getAllStrategists(): Promise<Strategist[]> {
    return Array.from(strategists.values());
  },

  // -------------------------------------------------------------------------
  // Strategies
  // -------------------------------------------------------------------------
  async createStrategy(input: CreateStrategyInput): Promise<AgentStrategy> {
    const strategy: AgentStrategy = {
      id: nextStrategyId++,
      onchain_id: input.onchain_id || null,
      owner_wallet: input.wallet_address.toLowerCase(),
      name: input.name,
      description: input.description,
      market_kind: input.market_kind,
      base_market: input.base_market,
      is_public: input.is_public,
      is_ai_controlled: input.is_ai_controlled,
      created_at: new Date(),
    };

    strategies.set(strategy.id, strategy);

    // Initialize stats
    const stats: StrategyStats = {
      id: strategy.id,
      strategy_id: strategy.id,
      total_signals: 0,
      winning_signals: 0,
      losing_signals: 0,
      win_rate_bps: 0,
      avg_pnl_bps: 0,
      total_pnl_bps: 0,
      best_win_bps: 0,
      worst_loss_bps: 0,
      followers_count: 0,
      updated_at: new Date(),
    };
    strategyStats.set(strategy.id, stats);

    saveData();
    return strategy;
  },

  async getStrategy(id: number): Promise<AgentStrategy | null> {
    return strategies.get(id) || null;
  },

  async getStrategyByOnchainId(onchainId: number): Promise<AgentStrategy | null> {
    for (const strategy of strategies.values()) {
      if (strategy.onchain_id === onchainId) {
        return strategy;
      }
    }
    return null;
  },

  async getStrategies(filters?: {
    market_kind?: string;
    base_market?: string;
    owner_wallet?: string;
    is_public?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<AgentStrategy[]> {
    let result = Array.from(strategies.values());

    if (filters) {
      if (filters.market_kind) {
        result = result.filter(s => s.market_kind === filters.market_kind);
      }
      if (filters.base_market) {
        result = result.filter(s => s.base_market === filters.base_market);
      }
      if (filters.owner_wallet) {
        const ownerWallet = filters.owner_wallet.toLowerCase();
        result = result.filter(s => s.owner_wallet === ownerWallet);
      }
      if (filters.is_public !== undefined) {
        result = result.filter(s => s.is_public === filters.is_public);
      }

      // Sort by created_at DESC
      result.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

      const offset = filters.offset || 0;
      const limit = filters.limit || 50;
      result = result.slice(offset, offset + limit);
    }

    return result;
  },

  async updateStrategyOnchainId(id: number, onchainId: number): Promise<void> {
    const strategy = strategies.get(id);
    if (strategy) {
      strategy.onchain_id = onchainId;
      saveData();
    }
  },

  // -------------------------------------------------------------------------
  // Signals
  // -------------------------------------------------------------------------
  async createSignal(input: CreateSignalInput): Promise<Signal> {
    const signal: Signal = {
      id: nextSignalId++,
      onchain_id: input.onchain_id || null,
      strategy_id: input.strategy_id,
      direction: input.direction,
      entry_value: input.entry_value || null,
      confidence_bps: input.confidence_bps,
      status: 'open',
      result: null,
      pnl_bps: null,
      resolved_value: null,
      created_at: new Date(),
      expires_at: input.expires_at,
      resolved_at: null,
    };

    signals.set(signal.id, signal);
    saveData();
    return signal;
  },

  async getSignal(id: number): Promise<Signal | null> {
    return signals.get(id) || null;
  },

  async getSignalByOnchainId(onchainId: number): Promise<Signal | null> {
    for (const signal of signals.values()) {
      if (signal.onchain_id === onchainId) {
        return signal;
      }
    }
    return null;
  },

  async getSignalsByStrategy(strategyId: number, limit = 50): Promise<Signal[]> {
    return Array.from(signals.values())
      .filter(s => s.strategy_id === strategyId)
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
      .slice(0, limit);
  },

  async getOpenSignals(): Promise<Signal[]> {
    return Array.from(signals.values())
      .filter(s => s.status === 'open')
      .sort((a, b) => a.expires_at.getTime() - b.expires_at.getTime());
  },

  async getExpiredUnresolvedSignals(): Promise<Signal[]> {
    const now = Date.now();
    return Array.from(signals.values())
      .filter(s => s.status === 'open' && s.expires_at.getTime() <= now)
      .sort((a, b) => a.expires_at.getTime() - b.expires_at.getTime());
  },

  async getRecentSignals(limit = 50): Promise<Signal[]> {
    return Array.from(signals.values())
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
      .slice(0, limit);
  },

  async resolveSignal(input: ResolveSignalInput): Promise<Signal | null> {
    const signal = signals.get(input.signal_id);
    if (!signal || signal.status !== 'open') {
      return null;
    }

    // Calculate result and PnL
    const { result, pnl_bps } = calculateSignalResult(signal, input.resolved_value);

    signal.status = 'resolved';
    signal.result = result;
    signal.pnl_bps = pnl_bps;
    signal.resolved_value = input.resolved_value;
    signal.resolved_at = new Date();

    // Update strategy stats
    await this.updateStrategyStats(signal.strategy_id);

    saveData();
    return signal;
  },

  async cancelSignal(signalId: number): Promise<Signal | null> {
    const signal = signals.get(signalId);
    if (!signal || signal.status !== 'open') {
      return null;
    }

    signal.status = 'cancelled';
    saveData();
    return signal;
  },

  // -------------------------------------------------------------------------
  // Stats
  // -------------------------------------------------------------------------
  async getStrategyStats(strategyId: number): Promise<StrategyStats | null> {
    // If stats don't exist yet, create them (this ensures follower count is accurate)
    if (!strategyStats.has(strategyId)) {
      const strategy = strategies.get(strategyId);
      if (strategy) {
        return await this.updateStrategyStats(strategyId);
      }
    }
    return strategyStats.get(strategyId) || null;
  },

  async updateStrategyStats(strategyId: number): Promise<StrategyStats> {
    // Get all signals for this strategy
    const allSignals = Array.from(signals.values())
      .filter(s => s.strategy_id === strategyId);
    
    // Get resolved signals for stats calculation
    const resolvedSignals = allSignals.filter(s => s.status === 'resolved');

    let wins = 0;
    let losses = 0;
    let totalPnl = 0;
    let bestWin = 0;
    let worstLoss = 0;

    for (const signal of resolvedSignals) {
      const pnl = signal.pnl_bps || 0;
      totalPnl += pnl;
      
      if (signal.result === 'win') {
        wins++;
        if (pnl > bestWin) bestWin = pnl;
      } else if (signal.result === 'lose') {
        losses++;
        if (pnl < worstLoss) worstLoss = pnl;
      }
    }

    const resolvedCount = resolvedSignals.length;
    const winRate = resolvedCount > 0 ? Math.round((wins * 10000) / resolvedCount) : 0;
    const avgPnl = resolvedCount > 0 ? Math.round(totalPnl / resolvedCount) : 0;

    const followerCount = Array.from(followers.values())
      .filter(f => f.strategy_id === strategyId).length;

    const stats: StrategyStats = {
      id: strategyId,
      strategy_id: strategyId,
      total_signals: allSignals.length,  // Count ALL signals, not just resolved
      winning_signals: wins,
      losing_signals: losses,
      win_rate_bps: winRate,
      avg_pnl_bps: avgPnl,
      total_pnl_bps: totalPnl,
      best_win_bps: bestWin,
      worst_loss_bps: worstLoss,
      followers_count: followerCount,
      updated_at: new Date(),
    };

    strategyStats.set(strategyId, stats);
    saveData();
    return stats;
  },

  async getTopStrategies(limit = 10): Promise<StrategyWithStats[]> {
    const publicStrategies = Array.from(strategies.values())
      .filter(s => s.is_public);

    const result: StrategyWithStats[] = [];

    for (const strategy of publicStrategies) {
      // Get or create stats for strategy
      let stats = strategyStats.get(strategy.id);
      if (!stats) {
        // Create default stats with follower count
        const followerCount = Array.from(followers.values())
          .filter(f => f.strategy_id === strategy.id).length;
        stats = {
          id: strategy.id,
          strategy_id: strategy.id,
          total_signals: 0,
          winning_signals: 0,
          losing_signals: 0,
          win_rate_bps: 0,
          avg_pnl_bps: 0,
          total_pnl_bps: 0,
          best_win_bps: 0,
          worst_loss_bps: 0,
          followers_count: followerCount,
          updated_at: new Date(),
        };
        strategyStats.set(strategy.id, stats);
      }
      result.push({ ...strategy, stats: stats! });
    }

    // Sort by followers DESC, then by win rate DESC, then by total PnL DESC
    result.sort((a, b) => {
      if (b.stats.followers_count !== a.stats.followers_count) {
        return b.stats.followers_count - a.stats.followers_count;
      }
      if (b.stats.win_rate_bps !== a.stats.win_rate_bps) {
        return b.stats.win_rate_bps - a.stats.win_rate_bps;
      }
      return b.stats.total_pnl_bps - a.stats.total_pnl_bps;
    });

    return result.slice(0, limit);
  },

  // -------------------------------------------------------------------------
  // Followers
  // -------------------------------------------------------------------------
  async followStrategy(input: FollowStrategyInput): Promise<Follower> {
    const key = `${input.strategy_id}-${input.wallet_address.toLowerCase()}`;
    
    const follower: Follower = {
      id: nextFollowerId++,
      strategy_id: input.strategy_id,
      wallet_address: input.wallet_address.toLowerCase(),
      auto_copy: input.auto_copy,
      max_exposure_units: input.max_exposure_units,
      created_at: new Date(),
    };

    followers.set(key, follower);

    // Update stats
    await this.updateStrategyStats(input.strategy_id);

    saveData();
    return follower;
  },

  async unfollowStrategy(strategyId: number, wallet: string): Promise<void> {
    const key = `${strategyId}-${wallet.toLowerCase()}`;
    followers.delete(key);

    // Update stats
    await this.updateStrategyStats(strategyId);

    saveData();
  },

  async getFollowers(strategyId: number): Promise<Follower[]> {
    return Array.from(followers.values())
      .filter(f => f.strategy_id === strategyId);
  },

  async isFollowing(strategyId: number, wallet: string): Promise<boolean> {
    const key = `${strategyId}-${wallet.toLowerCase()}`;
    return followers.has(key);
  },

  async getFollowerCount(strategyId: number): Promise<number> {
    return Array.from(followers.values())
      .filter(f => f.strategy_id === strategyId).length;
  },

  // -------------------------------------------------------------------------
  // Activity
  // -------------------------------------------------------------------------
  async logActivity(input: LogActivityInput): Promise<ActivityLog> {
    const log: ActivityLog = {
      id: nextActivityId++,
      wallet_address: input.wallet_address.toLowerCase(),
      username: input.username,
      action: input.action,
      details: input.details,
      created_at: new Date(),
    };

    activityLogs.unshift(log); // Add to beginning
    
    // Keep only last 1000 logs
    if (activityLogs.length > 1000) {
      activityLogs = activityLogs.slice(0, 1000);
    }

    saveData();
    return log;
  },

  async getActivityFeed(limit = 50): Promise<ActivityLog[]> {
    return activityLogs.slice(0, limit);
  },

  async getUserActivity(wallet: string, limit = 50): Promise<ActivityLog[]> {
    return activityLogs
      .filter(log => log.wallet_address === wallet.toLowerCase())
      .slice(0, limit);
  },

  // -------------------------------------------------------------------------
  // Utility
  // -------------------------------------------------------------------------
  async getGlobalStats(): Promise<{
    total_strategists: number;
    total_strategies: number;
    total_signals: number;
    total_resolved: number;
  }> {
    const resolvedSignals = Array.from(signals.values())
      .filter(s => s.status === 'resolved').length;

    return {
      total_strategists: strategists.size,
      total_strategies: strategies.size,
      total_signals: signals.size,
      total_resolved: resolvedSignals,
    };
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

function calculateSignalResult(
  signal: Signal,
  resolvedValue: number
): { result: SignalResult; pnl_bps: number } {
  const entry = signal.entry_value || 0;

  if (entry === 0 || resolvedValue === 0) {
    return { result: 'push', pnl_bps: 0 };
  }

  // Calculate PnL in basis points (price change percentage * 100)
  const pnlBps = Math.round(((resolvedValue - entry) * 10000) / entry);

  // Determine result based on direction (case-insensitive)
  let result: SignalResult;
  const direction = signal.direction.toLowerCase();

  // UP/OVER/YES = expecting price to go UP
  const isLongDirection = direction === 'up' || direction === 'over' || direction === 'yes' || direction === 'long';
  
  // DOWN/UNDER/NO = expecting price to go DOWN
  const isShortDirection = direction === 'down' || direction === 'under' || direction === 'no' || direction === 'short';

  let finalPnlBps: number;

  if (isLongDirection) {
    // LONG: Win if price went UP
    if (resolvedValue > entry) {
      result = 'win';
      finalPnlBps = Math.abs(pnlBps); // Positive PnL
    } else if (resolvedValue < entry) {
      result = 'lose';
      finalPnlBps = -Math.abs(pnlBps); // Negative PnL
    } else {
      result = 'push';
      finalPnlBps = 0;
    }
  } else if (isShortDirection) {
    // SHORT/DOWN: Win if price went DOWN
    if (resolvedValue < entry) {
      result = 'win';
      finalPnlBps = Math.abs(pnlBps); // Positive PnL for correct DOWN prediction
    } else if (resolvedValue > entry) {
      result = 'lose';
      finalPnlBps = -Math.abs(pnlBps); // Negative PnL for wrong DOWN prediction
    } else {
      result = 'push';
      finalPnlBps = 0;
    }
  } else {
    // Unknown direction - default to push
    result = 'push';
    finalPnlBps = 0;
  }

  console.log(`📊 Signal result: direction=${signal.direction}, entry=${entry}, resolved=${resolvedValue}, result=${result}, pnl=${finalPnlBps}bps`);

  return { result, pnl_bps: finalPnlBps };
}
