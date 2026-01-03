// ============================================================================
// AgentHub Backend - PostgreSQL Database
// Full PostgreSQL implementation for production on Render
// ============================================================================

import { Pool } from 'pg';
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
  SignalResult,
} from '../types';

// Create pool (will be initialized on first use)
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' 
        ? { rejectUnauthorized: false } 
        : false,
    });
  }
  return pool;
}

// Helper to run queries with error logging
async function query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
  try {
    const result = await getPool().query(sql, params);
    return result.rows as T[];
  } catch (error) {
    console.error('Database query error:', error);
    console.error('Query:', sql);
    console.error('Params:', params);
    throw error;
  }
}

async function queryOne<T = unknown>(sql: string, params?: unknown[]): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] || null;
}

// ============================================================================
// Database Implementation
// ============================================================================

export const postgresDb: Database = {
  // -------------------------------------------------------------------------
  // Strategists
  // -------------------------------------------------------------------------
  async createStrategist(input: CreateStrategistInput): Promise<Strategist> {
    const sql = `
      INSERT INTO strategists (wallet_address, display_name)
      VALUES ($1, $2)
      RETURNING *
    `;
    const result = await queryOne<Strategist>(sql, [
      input.wallet_address.toLowerCase(),
      input.display_name,
    ]);
    return result!;
  },

  async getStrategist(wallet: string): Promise<Strategist | null> {
    const sql = `SELECT * FROM strategists WHERE wallet_address = $1`;
    return queryOne<Strategist>(sql, [wallet.toLowerCase()]);
  },

  async getAllStrategists(): Promise<Strategist[]> {
    const sql = `SELECT * FROM strategists ORDER BY created_at DESC`;
    return query<Strategist>(sql);
  },

  // -------------------------------------------------------------------------
  // Strategies
  // -------------------------------------------------------------------------
  async createStrategy(input: CreateStrategyInput): Promise<AgentStrategy> {
    const sql = `
      INSERT INTO agent_strategies 
        (onchain_id, owner_wallet, name, description, market_kind, base_market, is_public, is_ai_controlled)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const result = await queryOne<AgentStrategy>(sql, [
      input.onchain_id || null,
      input.wallet_address.toLowerCase(),
      input.name,
      input.description,
      input.market_kind,
      input.base_market,
      input.is_public,
      input.is_ai_controlled,
    ]);

    // Initialize stats
    await query(`
      INSERT INTO strategy_stats (strategy_id) VALUES ($1)
      ON CONFLICT (strategy_id) DO NOTHING
    `, [result!.id]);

    return result!;
  },

  async getStrategy(id: number): Promise<AgentStrategy | null> {
    const sql = `SELECT * FROM agent_strategies WHERE id = $1`;
    return queryOne<AgentStrategy>(sql, [id]);
  },

  async getStrategyByOnchainId(onchainId: number): Promise<AgentStrategy | null> {
    const sql = `SELECT * FROM agent_strategies WHERE onchain_id = $1`;
    return queryOne<AgentStrategy>(sql, [onchainId]);
  },

  async getStrategies(filters?: {
    market_kind?: string;
    base_market?: string;
    owner_wallet?: string;
    is_public?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<AgentStrategy[]> {
    let sql = `SELECT * FROM agent_strategies WHERE 1=1`;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters?.market_kind) {
      sql += ` AND market_kind = $${paramIndex++}`;
      params.push(filters.market_kind);
    }
    if (filters?.base_market) {
      sql += ` AND base_market = $${paramIndex++}`;
      params.push(filters.base_market);
    }
    if (filters?.owner_wallet) {
      sql += ` AND owner_wallet = $${paramIndex++}`;
      params.push(filters.owner_wallet.toLowerCase());
    }
    if (filters?.is_public !== undefined) {
      sql += ` AND is_public = $${paramIndex++}`;
      params.push(filters.is_public);
    }

    sql += ` ORDER BY created_at DESC`;

    if (filters?.limit) {
      sql += ` LIMIT $${paramIndex++}`;
      params.push(filters.limit);
    }
    if (filters?.offset) {
      sql += ` OFFSET $${paramIndex++}`;
      params.push(filters.offset);
    }

    return query<AgentStrategy>(sql, params);
  },

  async updateStrategyOnchainId(id: number, onchainId: number): Promise<void> {
    await query(`UPDATE agent_strategies SET onchain_id = $1 WHERE id = $2`, [onchainId, id]);
  },

  // -------------------------------------------------------------------------
  // Signals
  // -------------------------------------------------------------------------
  async createSignal(input: CreateSignalInput): Promise<Signal> {
    const sql = `
      INSERT INTO signals 
        (onchain_id, strategy_id, direction, entry_value, confidence_bps, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await queryOne<Signal>(sql, [
      input.onchain_id || null,
      input.strategy_id,
      input.direction,
      input.entry_value || null,
      input.confidence_bps,
      input.expires_at,
    ]);
    return result!;
  },

  async getSignal(id: number): Promise<Signal | null> {
    const sql = `SELECT * FROM signals WHERE id = $1`;
    return queryOne<Signal>(sql, [id]);
  },

  async getSignalByOnchainId(onchainId: number): Promise<Signal | null> {
    const sql = `SELECT * FROM signals WHERE onchain_id = $1`;
    return queryOne<Signal>(sql, [onchainId]);
  },

  async getSignalsByStrategy(strategyId: number, limit = 50): Promise<Signal[]> {
    const sql = `
      SELECT * FROM signals 
      WHERE strategy_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2
    `;
    return query<Signal>(sql, [strategyId, limit]);
  },

  async getOpenSignals(): Promise<Signal[]> {
    const sql = `
      SELECT * FROM signals 
      WHERE status = 'open' 
      ORDER BY expires_at ASC
    `;
    return query<Signal>(sql);
  },

  async getExpiredUnresolvedSignals(): Promise<Signal[]> {
    const sql = `
      SELECT * FROM signals 
      WHERE status = 'open' AND expires_at <= NOW()
      ORDER BY expires_at ASC
    `;
    return query<Signal>(sql);
  },

  async getRecentSignals(limit = 50): Promise<Signal[]> {
    const sql = `
      SELECT * FROM signals 
      ORDER BY created_at DESC 
      LIMIT $1
    `;
    return query<Signal>(sql, [limit]);
  },

  async resolveSignal(input: ResolveSignalInput): Promise<Signal | null> {
    // Get signal first
    const signal = await this.getSignal(input.signal_id);
    if (!signal || signal.status !== 'open') {
      return null;
    }

    // Calculate result
    const { result, pnl_bps } = calculateSignalResult(signal, input.resolved_value);

    const sql = `
      UPDATE signals 
      SET status = 'resolved', 
          result = $1, 
          pnl_bps = $2, 
          resolved_value = $3, 
          resolved_at = NOW()
      WHERE id = $4
      RETURNING *
    `;
    const updated = await queryOne<Signal>(sql, [
      result,
      pnl_bps,
      input.resolved_value,
      input.signal_id,
    ]);

    // Update strategy stats
    if (updated) {
      await this.updateStrategyStats(updated.strategy_id);
    }

    return updated;
  },

  async cancelSignal(signalId: number): Promise<Signal | null> {
    const sql = `
      UPDATE signals 
      SET status = 'cancelled'
      WHERE id = $1 AND status = 'open'
      RETURNING *
    `;
    return queryOne<Signal>(sql, [signalId]);
  },

  // -------------------------------------------------------------------------
  // Stats
  // -------------------------------------------------------------------------
  async getStrategyStats(strategyId: number): Promise<StrategyStats | null> {
    const sql = `SELECT * FROM strategy_stats WHERE strategy_id = $1`;
    return queryOne<StrategyStats>(sql, [strategyId]);
  },

  async updateStrategyStats(strategyId: number): Promise<StrategyStats> {
    // Calculate stats from signals
    const statsQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE status = 'resolved') as total,
        COUNT(*) FILTER (WHERE result = 'win') as wins,
        COUNT(*) FILTER (WHERE result = 'lose') as losses,
        COALESCE(SUM(pnl_bps) FILTER (WHERE status = 'resolved'), 0) as total_pnl
      FROM signals 
      WHERE strategy_id = $1
    `;
    const statsResult = await queryOne<{
      total: string;
      wins: string;
      losses: string;
      total_pnl: string;
    }>(statsQuery, [strategyId]);

    const total = parseInt(statsResult?.total || '0');
    const wins = parseInt(statsResult?.wins || '0');
    const losses = parseInt(statsResult?.losses || '0');
    const totalPnl = parseInt(statsResult?.total_pnl || '0');

    const winRate = total > 0 ? Math.round((wins * 10000) / total) : 0;
    const avgPnl = total > 0 ? Math.round(totalPnl / total) : 0;

    // Get follower count
    const followerCount = await this.getFollowerCount(strategyId);

    // Upsert stats
    const sql = `
      INSERT INTO strategy_stats 
        (strategy_id, total_signals, winning_signals, losing_signals, win_rate_bps, avg_pnl_bps, total_pnl_bps, followers_count, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (strategy_id) DO UPDATE SET
        total_signals = $2,
        winning_signals = $3,
        losing_signals = $4,
        win_rate_bps = $5,
        avg_pnl_bps = $6,
        total_pnl_bps = $7,
        followers_count = $8,
        updated_at = NOW()
      RETURNING *
    `;
    const result = await queryOne<StrategyStats>(sql, [
      strategyId,
      total,
      wins,
      losses,
      winRate,
      avgPnl,
      totalPnl,
      followerCount,
    ]);

    return result!;
  },

  async getTopStrategies(limit = 10): Promise<StrategyWithStats[]> {
    const sql = `
      SELECT 
        s.*,
        ss.total_signals,
        ss.winning_signals,
        ss.losing_signals,
        ss.win_rate_bps,
        ss.avg_pnl_bps,
        ss.total_pnl_bps,
        ss.followers_count,
        ss.updated_at as stats_updated_at
      FROM agent_strategies s
      JOIN strategy_stats ss ON s.id = ss.strategy_id
      WHERE s.is_public = true AND ss.total_signals > 0
      ORDER BY ss.win_rate_bps DESC, ss.total_pnl_bps DESC
      LIMIT $1
    `;
    const rows = await query<AgentStrategy & {
      total_signals: number;
      winning_signals: number;
      losing_signals: number;
      win_rate_bps: number;
      avg_pnl_bps: number;
      total_pnl_bps: number;
      followers_count: number;
      stats_updated_at: Date;
    }>(sql, [limit]);

    return rows.map(row => ({
      id: row.id,
      onchain_id: row.onchain_id,
      owner_wallet: row.owner_wallet,
      name: row.name,
      description: row.description,
      market_kind: row.market_kind,
      base_market: row.base_market,
      is_public: row.is_public,
      is_ai_controlled: row.is_ai_controlled,
      created_at: row.created_at,
      stats: {
        id: row.id,
        strategy_id: row.id,
        total_signals: row.total_signals,
        winning_signals: row.winning_signals,
        losing_signals: row.losing_signals,
        win_rate_bps: row.win_rate_bps,
        avg_pnl_bps: row.avg_pnl_bps,
        total_pnl_bps: row.total_pnl_bps,
        followers_count: row.followers_count,
        updated_at: row.stats_updated_at,
      },
    }));
  },

  // -------------------------------------------------------------------------
  // Followers
  // -------------------------------------------------------------------------
  async followStrategy(input: FollowStrategyInput): Promise<Follower> {
    const sql = `
      INSERT INTO followers (strategy_id, wallet_address, auto_copy, max_exposure_units)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (strategy_id, wallet_address) DO UPDATE SET
        auto_copy = $3,
        max_exposure_units = $4
      RETURNING *
    `;
    const result = await queryOne<Follower>(sql, [
      input.strategy_id,
      input.wallet_address.toLowerCase(),
      input.auto_copy,
      input.max_exposure_units,
    ]);

    // Update stats
    await this.updateStrategyStats(input.strategy_id);

    return result!;
  },

  async unfollowStrategy(strategyId: number, wallet: string): Promise<void> {
    await query(`
      DELETE FROM followers 
      WHERE strategy_id = $1 AND wallet_address = $2
    `, [strategyId, wallet.toLowerCase()]);

    // Update stats
    await this.updateStrategyStats(strategyId);
  },

  async getFollowers(strategyId: number): Promise<Follower[]> {
    const sql = `SELECT * FROM followers WHERE strategy_id = $1`;
    return query<Follower>(sql, [strategyId]);
  },

  async isFollowing(strategyId: number, wallet: string): Promise<boolean> {
    const sql = `
      SELECT 1 FROM followers 
      WHERE strategy_id = $1 AND wallet_address = $2
    `;
    const result = await queryOne(sql, [strategyId, wallet.toLowerCase()]);
    return !!result;
  },

  async getFollowerCount(strategyId: number): Promise<number> {
    const sql = `SELECT COUNT(*) as count FROM followers WHERE strategy_id = $1`;
    const result = await queryOne<{ count: string }>(sql, [strategyId]);
    return parseInt(result?.count || '0');
  },

  // -------------------------------------------------------------------------
  // Activity
  // -------------------------------------------------------------------------
  async logActivity(input: LogActivityInput): Promise<ActivityLog> {
    const sql = `
      INSERT INTO activity_logs (wallet_address, username, action, details)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await queryOne<ActivityLog>(sql, [
      input.wallet_address.toLowerCase(),
      input.username,
      input.action,
      JSON.stringify(input.details),
    ]);
    return result!;
  },

  async getActivityFeed(limit = 50): Promise<ActivityLog[]> {
    const sql = `
      SELECT * FROM activity_logs 
      ORDER BY created_at DESC 
      LIMIT $1
    `;
    return query<ActivityLog>(sql, [limit]);
  },

  async getUserActivity(wallet: string, limit = 50): Promise<ActivityLog[]> {
    const sql = `
      SELECT * FROM activity_logs 
      WHERE wallet_address = $1 
      ORDER BY created_at DESC 
      LIMIT $2
    `;
    return query<ActivityLog>(sql, [wallet.toLowerCase(), limit]);
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
    const sql = `
      SELECT 
        (SELECT COUNT(*) FROM strategists) as total_strategists,
        (SELECT COUNT(*) FROM agent_strategies) as total_strategies,
        (SELECT COUNT(*) FROM signals) as total_signals,
        (SELECT COUNT(*) FROM signals WHERE status = 'resolved') as total_resolved
    `;
    const result = await queryOne<{
      total_strategists: string;
      total_strategies: string;
      total_signals: string;
      total_resolved: string;
    }>(sql);

    return {
      total_strategists: parseInt(result?.total_strategists || '0'),
      total_strategies: parseInt(result?.total_strategies || '0'),
      total_signals: parseInt(result?.total_signals || '0'),
      total_resolved: parseInt(result?.total_resolved || '0'),
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

  // Calculate PnL in basis points
  let pnl_bps = Math.round(((resolvedValue - entry) * 10000) / entry);

  // Determine result based on direction
  let result: SignalResult;
  const direction = signal.direction;

  if (direction === 'Up' || direction === 'Over' || direction === 'Yes') {
    if (resolvedValue > entry) {
      result = 'win';
    } else if (resolvedValue < entry) {
      result = 'lose';
    } else {
      result = 'push';
    }
  } else {
    // Down, Under, No
    if (resolvedValue < entry) {
      result = 'win';
      pnl_bps = -pnl_bps; // Positive PnL for correct DOWN prediction
    } else if (resolvedValue > entry) {
      result = 'lose';
      pnl_bps = -pnl_bps; // Negative PnL for wrong DOWN prediction
    } else {
      result = 'push';
    }
  }

  return { result, pnl_bps };
}

// ============================================================================
// Migrations
// ============================================================================

export async function runMigrations(): Promise<void> {
  console.log('🔄 Running database migrations...');

  // Strategists table
  await query(`
    CREATE TABLE IF NOT EXISTS strategists (
      id SERIAL PRIMARY KEY,
      wallet_address VARCHAR(66) UNIQUE NOT NULL,
      display_name VARCHAR(80) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Agent strategies table
  await query(`
    CREATE TABLE IF NOT EXISTS agent_strategies (
      id SERIAL PRIMARY KEY,
      onchain_id BIGINT,
      owner_wallet VARCHAR(66) NOT NULL,
      name VARCHAR(120) NOT NULL,
      description TEXT,
      market_kind VARCHAR(32) NOT NULL,
      base_market VARCHAR(64) NOT NULL,
      is_public BOOLEAN DEFAULT TRUE,
      is_ai_controlled BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Signals table
  await query(`
    CREATE TABLE IF NOT EXISTS signals (
      id SERIAL PRIMARY KEY,
      onchain_id BIGINT,
      strategy_id INTEGER REFERENCES agent_strategies(id) ON DELETE CASCADE,
      direction VARCHAR(16) NOT NULL,
      entry_value BIGINT,
      confidence_bps INTEGER,
      status VARCHAR(16) DEFAULT 'open',
      result VARCHAR(16),
      pnl_bps INTEGER,
      resolved_value BIGINT,
      created_at TIMESTAMP DEFAULT NOW(),
      expires_at TIMESTAMP NOT NULL,
      resolved_at TIMESTAMP
    )
  `);

  // Strategy stats table
  await query(`
    CREATE TABLE IF NOT EXISTS strategy_stats (
      id SERIAL PRIMARY KEY,
      strategy_id INTEGER UNIQUE REFERENCES agent_strategies(id) ON DELETE CASCADE,
      total_signals BIGINT DEFAULT 0,
      winning_signals BIGINT DEFAULT 0,
      losing_signals BIGINT DEFAULT 0,
      win_rate_bps INTEGER DEFAULT 0,
      avg_pnl_bps INTEGER DEFAULT 0,
      total_pnl_bps BIGINT DEFAULT 0,
      followers_count BIGINT DEFAULT 0,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Followers table
  await query(`
    CREATE TABLE IF NOT EXISTS followers (
      id SERIAL PRIMARY KEY,
      strategy_id INTEGER REFERENCES agent_strategies(id) ON DELETE CASCADE,
      wallet_address VARCHAR(66) NOT NULL,
      auto_copy BOOLEAN DEFAULT FALSE,
      max_exposure_units BIGINT DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (strategy_id, wallet_address)
    )
  `);

  // Activity logs table
  await query(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id SERIAL PRIMARY KEY,
      wallet_address VARCHAR(66) NOT NULL,
      username VARCHAR(80) NOT NULL,
      action VARCHAR(50) NOT NULL,
      details JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Create indexes
  await query(`CREATE INDEX IF NOT EXISTS idx_strategies_market ON agent_strategies(market_kind)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_strategies_base ON agent_strategies(base_market)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_strategies_owner ON agent_strategies(owner_wallet)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_signals_strategy ON signals(strategy_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_signals_status ON signals(status)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_signals_expires ON signals(expires_at)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_activity_wallet ON activity_logs(wallet_address)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_activity_time ON activity_logs(created_at DESC)`);

  console.log('✅ Migrations complete!');
}
