// ============================================================================
// AgentHub Backend - Signal Resolver
// Periodically resolves expired signals using real crypto prices
// ============================================================================

import type { Database, Signal, StrategyWithStats } from '../types';
import { getPrice, extractAssetFromMarket } from './priceService';
import type { Server as SocketIOServer } from 'socket.io';

export interface ResolverConfig {
  db: Database;
  io: SocketIOServer;
  intervalMs?: number;
}

let resolverInterval: NodeJS.Timeout | null = null;

export function startResolver(config: ResolverConfig): void {
  const { db, io, intervalMs = 30_000 } = config; // Default: every 30 seconds

  console.log(`🔄 Starting signal resolver (interval: ${intervalMs}ms)`);

  // Clear any existing interval
  if (resolverInterval) {
    clearInterval(resolverInterval);
  }

  resolverInterval = setInterval(async () => {
    try {
      await resolveExpiredSignals(db, io);
    } catch (error) {
      console.error('Resolver error:', error);
    }
  }, intervalMs);

  // Also run immediately on start
  resolveExpiredSignals(db, io).catch(console.error);
}

export function stopResolver(): void {
  if (resolverInterval) {
    clearInterval(resolverInterval);
    resolverInterval = null;
    console.log('🛑 Signal resolver stopped');
  }
}

async function resolveExpiredSignals(db: Database, io: SocketIOServer): Promise<void> {
  // Get all expired but unresolved signals
  const expiredSignals = await db.getExpiredUnresolvedSignals();

  if (expiredSignals.length === 0) {
    return;
  }

  console.log(`📊 Found ${expiredSignals.length} expired signals to resolve`);

  for (const signal of expiredSignals) {
    try {
      // Get the strategy to determine asset
      const strategy = await db.getStrategy(signal.strategy_id);
      if (!strategy) {
        console.warn(`Strategy ${signal.strategy_id} not found for signal ${signal.id}`);
        continue;
      }

      // Only auto-resolve crypto signals
      if (strategy.market_kind !== 'Crypto') {
        console.log(`Skipping non-crypto signal ${signal.id}`);
        continue;
      }

      // Extract asset from signal.asset (if set) or fallback to strategy.base_market
      const signalAsset = signal.asset || strategy.base_market;
      const asset = extractAssetFromMarket(signalAsset);
      if (!asset) {
        console.warn(`Could not extract asset from ${signalAsset}`);
        continue;
      }

      console.log(`📊 Resolving signal ${signal.id} with asset ${asset} (from ${signalAsset})`);

      // Get current price for the correct asset
      const price = await getPrice(asset);
      if (price.price === 0) {
        console.warn(`Could not get price for ${asset}`);
        continue;
      }

      // Resolve the signal
      const resolved = await db.resolveSignal({
        signal_id: signal.id,
        resolved_value: price.price,
      });

      if (resolved) {
        console.log(
          `✅ Resolved signal ${signal.id}: ${resolved.result} (${resolved.pnl_bps} bps)`
        );

        // Broadcast resolution via WebSocket
        io.emit('signal:resolved', {
          signal_id: resolved.id,
          strategy_id: resolved.strategy_id,
          strategy_name: strategy.name,
          result: resolved.result,
          pnl_bps: resolved.pnl_bps,
          direction: resolved.direction,
          entry_value: resolved.entry_value,
          resolved_value: resolved.resolved_value,
          resolved_at: resolved.resolved_at,
        });

        // Log activity
        const strategist = await db.getStrategist(strategy.owner_wallet);
        await db.logActivity({
          wallet_address: strategy.owner_wallet,
          username: strategist?.display_name || strategy.name,
          action: 'SIGNAL_RESOLVED',
          details: {
            signal_id: resolved.id,
            strategy_id: resolved.strategy_id,
            strategy_name: strategy.name,
            result: resolved.result,
            pnl_bps: resolved.pnl_bps,
            direction: resolved.direction,
          },
        });
      }
    } catch (error) {
      console.error(`Error resolving signal ${signal.id}:`, error);
    }
  }
}
