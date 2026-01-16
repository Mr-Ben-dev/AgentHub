// ============================================================================
// AgentHub Backend - API Routes
// REST endpoints for strategies, signals, feed, and more
// ============================================================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import type { Database, MarketKind, Direction } from '../types';
import { getAllPrices, getPrice, extractAssetFromMarket } from '../services/priceService';
import { isUsingPostgres } from '../db/selector';

// Validation schemas
const CreateStrategistSchema = z.object({
  wallet_address: z.string().min(10),
  display_name: z.string().min(1).max(80),
  bio: z.string().max(500).optional().default(''),
});

const CreateStrategySchema = z.object({
  wallet_address: z.string().min(10),
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional().default(''),
  market_kind: z.enum(['Crypto', 'Sports', 'PredictionApp']),
  base_market: z.string().min(1).max(64),
  is_public: z.boolean().optional().default(true),
  is_ai_controlled: z.boolean().optional().default(false),
});

const PublishSignalSchema = z.object({
  wallet_address: z.string().min(10),
  strategy_id: z.number().int().positive(),
  direction: z.enum(['Up', 'Down', 'Over', 'Under', 'Yes', 'No']),
  horizon_secs: z.number().int().positive(), // No max limit for testing
  confidence_bps: z.number().int().min(0).max(10000),
  entry_value: z.number().int().positive().optional(),
});

const FollowStrategySchema = z.object({
  wallet_address: z.string().min(10),
  strategy_id: z.number().int().positive(),
  auto_copy: z.boolean().optional().default(false),
  max_exposure_units: z.number().int().min(0).optional().default(0),
});

export function createApiRouter(db: Database): Router {
  const router = Router();

  // =========================================================================
  // Health & Stats
  // =========================================================================

  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      mode: isUsingPostgres() ? 'postgresql' : 'memory',
    });
  });

  router.get('/stats', async (_req: Request, res: Response) => {
    try {
      const stats = await db.getGlobalStats();
      res.json(stats);
    } catch (error) {
      console.error('Error getting stats:', error);
      res.status(500).json({ error: 'Failed to get stats' });
    }
  });

  // =========================================================================
  // Prices
  // =========================================================================

  router.get('/prices', async (_req: Request, res: Response) => {
    try {
      const prices = await getAllPrices();
      res.json(prices);
    } catch (error) {
      console.error('Error getting prices:', error);
      res.status(500).json({ error: 'Failed to get prices' });
    }
  });

  router.get('/prices/:symbol', async (req: Request, res: Response) => {
    try {
      const price = await getPrice(req.params.symbol);
      res.json(price);
    } catch (error) {
      console.error('Error getting price:', error);
      res.status(500).json({ error: 'Failed to get price' });
    }
  });

  // =========================================================================
  // Strategists
  // =========================================================================

  router.post('/strategists', async (req: Request, res: Response) => {
    try {
      const input = CreateStrategistSchema.parse(req.body);
      
      // Check if already registered
      const existing = await db.getStrategist(input.wallet_address);
      if (existing) {
        return res.status(400).json({ error: 'Already registered' });
      }

      const strategist = await db.createStrategist(input);

      // Log activity
      await db.logActivity({
        wallet_address: input.wallet_address,
        username: input.display_name,
        action: 'STRATEGIST_REGISTERED',
        details: { display_name: input.display_name },
      });

      res.status(201).json(strategist);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid input', details: error.errors });
      }
      console.error('Error creating strategist:', error);
      res.status(500).json({ error: 'Failed to create strategist' });
    }
  });

  router.get('/strategists/:wallet', async (req: Request, res: Response) => {
    try {
      const strategist = await db.getStrategist(req.params.wallet);
      
      // IMPORTANT: Don't auto-create strategist! Return isRegistered: false
      // This follows the fix from Arcade's example.md
      if (!strategist) {
        return res.json({ 
          isRegistered: false,
          wallet_address: req.params.wallet.toLowerCase(),
        });
      }

      res.json({ ...strategist, isRegistered: true });
    } catch (error) {
      console.error('Error getting strategist:', error);
      res.status(500).json({ error: 'Failed to get strategist' });
    }
  });

  // =========================================================================
  // Strategies
  // =========================================================================

  router.get('/strategies', async (req: Request, res: Response) => {
    try {
      const filters = {
        market_kind: req.query.market_kind as MarketKind | undefined,
        base_market: req.query.base_market as string | undefined,
        owner_wallet: req.query.owner_wallet as string | undefined,
        is_public: req.query.is_public === 'true' ? true : 
                   req.query.is_public === 'false' ? false : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      };

      const strategies = await db.getStrategies(filters);
      
      // Attach stats to each strategy
      const withStats = await Promise.all(
        strategies.map(async (strategy) => {
          const stats = await db.getStrategyStats(strategy.id);
          return { ...strategy, stats };
        })
      );

      res.json(withStats);
    } catch (error) {
      console.error('Error getting strategies:', error);
      res.status(500).json({ error: 'Failed to get strategies' });
    }
  });

  router.get('/strategies/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const strategy = await db.getStrategy(id);
      
      if (!strategy) {
        return res.status(404).json({ error: 'Strategy not found' });
      }

      const stats = await db.getStrategyStats(id);
      res.json({ ...strategy, stats });
    } catch (error) {
      console.error('Error getting strategy:', error);
      res.status(500).json({ error: 'Failed to get strategy' });
    }
  });

  router.get('/strategies/:id/signals', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const status = req.query.status as string | undefined;
      
      let signals = await db.getSignalsByStrategy(id, limit);
      
      // Filter by status if provided
      if (status === 'open') {
        signals = signals.filter(s => s.status === 'open');
      } else if (status === 'closed') {
        signals = signals.filter(s => s.status !== 'open');
      }
      
      res.json(signals);
    } catch (error) {
      console.error('Error getting signals:', error);
      res.status(500).json({ error: 'Failed to get signals' });
    }
  });

  router.post('/strategies', async (req: Request, res: Response) => {
    try {
      const input = CreateStrategySchema.parse(req.body);
      
      // Check if strategist is registered
      const strategist = await db.getStrategist(input.wallet_address);
      if (!strategist) {
        return res.status(400).json({ error: 'Strategist not registered' });
      }

      const strategy = await db.createStrategy({
        wallet_address: input.wallet_address,
        name: input.name,
        description: input.description || '',
        market_kind: input.market_kind,
        base_market: input.base_market,
        is_public: input.is_public,
        is_ai_controlled: input.is_ai_controlled,
      });

      // Log activity
      await db.logActivity({
        wallet_address: input.wallet_address,
        username: strategist.display_name,
        action: 'STRATEGY_CREATED',
        details: {
          strategy_id: strategy.id,
          strategy_name: strategy.name,
          market_kind: strategy.market_kind,
          base_market: strategy.base_market,
        },
      });

      res.status(201).json(strategy);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid input', details: error.errors });
      }
      console.error('Error creating strategy:', error);
      res.status(500).json({ error: 'Failed to create strategy' });
    }
  });

  // PATCH /strategies/:id/onchain - Link backend strategy to on-chain ID
  router.patch('/strategies/:id/onchain', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { onchain_id } = req.body;
      
      if (typeof onchain_id !== 'number' || onchain_id < 0) {
        return res.status(400).json({ error: 'Invalid onchain_id' });
      }
      
      const strategy = await db.getStrategy(id);
      if (!strategy) {
        return res.status(404).json({ error: 'Strategy not found' });
      }
      
      await db.updateStrategyOnchainId(id, onchain_id);
      
      console.log(`✅ Linked backend strategy ${id} to on-chain ID ${onchain_id}`);
      res.json({ success: true, id, onchain_id });
    } catch (error) {
      console.error('Error updating onchain_id:', error);
      res.status(500).json({ error: 'Failed to update onchain_id' });
    }
  });

  // =========================================================================
  // Signals
  // =========================================================================

  router.get('/signals', async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const signals = await db.getRecentSignals(limit);
      res.json(signals);
    } catch (error) {
      console.error('Error getting signals:', error);
      res.status(500).json({ error: 'Failed to get signals' });
    }
  });

  router.get('/signals/open', async (_req: Request, res: Response) => {
    try {
      const signals = await db.getOpenSignals();
      res.json(signals);
    } catch (error) {
      console.error('Error getting open signals:', error);
      res.status(500).json({ error: 'Failed to get open signals' });
    }
  });

  router.post('/signals', async (req: Request, res: Response) => {
    try {
      const input = PublishSignalSchema.parse(req.body);
      
      // Get strategy
      const strategy = await db.getStrategy(input.strategy_id);
      if (!strategy) {
        return res.status(404).json({ error: 'Strategy not found' });
      }

      // Verify ownership
      if (strategy.owner_wallet.toLowerCase() !== input.wallet_address.toLowerCase()) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      // Get entry value (current price for crypto)
      let entryValue = input.entry_value;
      if (!entryValue && strategy.market_kind.toLowerCase() === 'crypto') {
        const asset = extractAssetFromMarket(strategy.base_market);
        if (asset) {
          const price = await getPrice(asset);
          entryValue = price.price;
          console.log(`📈 Got entry price for ${asset}: ${entryValue} cents`);
        }
      }

      // Calculate expires_at
      const expiresAt = new Date(Date.now() + input.horizon_secs * 1000);

      const signal = await db.createSignal({
        strategy_id: input.strategy_id,
        direction: input.direction as Direction,
        entry_value: entryValue,
        confidence_bps: input.confidence_bps,
        expires_at: expiresAt,
      });

      // Log activity
      const strategist = await db.getStrategist(input.wallet_address);
      await db.logActivity({
        wallet_address: input.wallet_address,
        username: strategist?.display_name || strategy.name,
        action: 'SIGNAL_PUBLISHED',
        details: {
          signal_id: signal.id,
          strategy_id: signal.strategy_id,
          strategy_name: strategy.name,
          direction: signal.direction,
          confidence_bps: signal.confidence_bps,
          entry_value: signal.entry_value,
        },
      });

      res.status(201).json(signal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid input', details: error.errors });
      }
      console.error('Error creating signal:', error);
      res.status(500).json({ error: 'Failed to create signal' });
    }
  });

  // =========================================================================
  // Feed
  // =========================================================================

  router.get('/feed', async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      
      // Get recent signals with strategy info
      const signals = await db.getRecentSignals(limit);
      
      const feed = await Promise.all(
        signals.map(async (signal) => {
          const strategy = await db.getStrategy(signal.strategy_id);
          return {
            ...signal,
            strategy_name: strategy?.name,
            base_market: strategy?.base_market,
            is_ai_controlled: strategy?.is_ai_controlled,
          };
        })
      );

      res.json(feed);
    } catch (error) {
      console.error('Error getting feed:', error);
      res.status(500).json({ error: 'Failed to get feed' });
    }
  });

  // =========================================================================
  // Rankings
  // =========================================================================

  router.get('/rankings/top', async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const topStrategies = await db.getTopStrategies(limit);
      res.json(topStrategies);
    } catch (error) {
      console.error('Error getting rankings:', error);
      res.status(500).json({ error: 'Failed to get rankings' });
    }
  });

  // =========================================================================
  // Followers
  // =========================================================================

  router.post('/follow', async (req: Request, res: Response) => {
    try {
      const input = FollowStrategySchema.parse(req.body);
      
      // Check if strategy exists
      const strategy = await db.getStrategy(input.strategy_id);
      if (!strategy) {
        return res.status(404).json({ error: 'Strategy not found' });
      }

      // Check if already following
      const isFollowing = await db.isFollowing(input.strategy_id, input.wallet_address);
      if (isFollowing) {
        return res.status(400).json({ error: 'Already following' });
      }

      const follower = await db.followStrategy({
        strategy_id: input.strategy_id,
        wallet_address: input.wallet_address,
        auto_copy: input.auto_copy,
        max_exposure_units: input.max_exposure_units,
      });

      // Log activity
      const strategist = await db.getStrategist(input.wallet_address);
      await db.logActivity({
        wallet_address: input.wallet_address,
        username: strategist?.display_name || 'User',
        action: 'STRATEGY_FOLLOWED',
        details: {
          strategy_id: strategy.id,
          strategy_name: strategy.name,
        },
      });

      res.status(201).json(follower);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid input', details: error.errors });
      }
      console.error('Error following strategy:', error);
      res.status(500).json({ error: 'Failed to follow strategy' });
    }
  });

  router.delete('/follow', async (req: Request, res: Response) => {
    try {
      const { wallet_address, strategy_id } = req.body;
      
      if (!wallet_address || !strategy_id) {
        return res.status(400).json({ error: 'Missing wallet_address or strategy_id' });
      }

      await db.unfollowStrategy(parseInt(strategy_id), wallet_address);
      res.json({ success: true });
    } catch (error) {
      console.error('Error unfollowing strategy:', error);
      res.status(500).json({ error: 'Failed to unfollow strategy' });
    }
  });

  router.get('/follow/check', async (req: Request, res: Response) => {
    try {
      const { wallet_address, strategy_id } = req.query;
      
      if (!wallet_address || !strategy_id) {
        return res.status(400).json({ error: 'Missing wallet_address or strategy_id' });
      }

      const isFollowing = await db.isFollowing(
        parseInt(strategy_id as string),
        wallet_address as string
      );
      res.json({ isFollowing });
    } catch (error) {
      console.error('Error checking follow status:', error);
      res.status(500).json({ error: 'Failed to check follow status' });
    }
  });

  // =========================================================================
  // Activity
  // =========================================================================

  router.get('/activity', async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const activity = await db.getActivityFeed(limit);
      res.json(activity);
    } catch (error) {
      console.error('Error getting activity:', error);
      res.status(500).json({ error: 'Failed to get activity' });
    }
  });

  router.get('/activity/:wallet', async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const activity = await db.getUserActivity(req.params.wallet, limit);
      res.json(activity);
    } catch (error) {
      console.error('Error getting user activity:', error);
      res.status(500).json({ error: 'Failed to get user activity' });
    }
  });

  return router;
}
