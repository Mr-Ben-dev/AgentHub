// ============================================================================
// RankingsPage - Premium Leaderboard with Lucide Icons
// ============================================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { api, StrategyWithStats } from '@/lib/api';
import { RingLoader, EmptyState } from '@/components/ui/Loading';
import {
  Trophy,
  TrendingUp,
  Target,
  BarChart3,
  Users,
  Crown,
  Medal,
  Award,
  Sparkles,
  ChevronDown,
  Bitcoin,
  Gamepad2,
  Flame,
  ArrowUpRight,
} from 'lucide-react';
import {
  cn,
  formatPercent,
  formatNumber,
  shortenAddress,
} from '@/lib/utils';

type SortMetric = 'pnl' | 'winRate' | 'signals' | 'followers';

const marketIcons: Record<string, React.ReactNode> = {
  crypto: <Bitcoin className="w-5 h-5" />,
  prediction: <Target className="w-5 h-5" />,
  gaming: <Gamepad2 className="w-5 h-5" />,
  sports: <Trophy className="w-5 h-5" />,
};

export default function RankingsPage() {
  const [sortBy, setSortBy] = useState<SortMetric>('pnl');
  const [limit, setLimit] = useState(20);

  const { data: strategies, isLoading } = useQuery({
    queryKey: ['rankings', limit],
    queryFn: () => api.getTopStrategies(limit),
  });

  // Sort strategies based on selected metric
  const sortedStrategies = strategies?.slice().sort((a, b) => {
    switch (sortBy) {
      case 'winRate':
        return b.stats.winRate - a.stats.winRate;
      case 'signals':
        return b.stats.totalSignals - a.stats.totalSignals;
      case 'followers':
        return b.stats.followers - a.stats.followers;
      case 'pnl':
      default:
        return b.stats.totalPnl - a.stats.totalPnl;
    }
  });

  const sortOptions: { value: SortMetric; label: string; icon: React.ReactNode }[] = [
    { value: 'pnl', label: 'Total P&L', icon: <TrendingUp className="w-4 h-4" /> },
    { value: 'winRate', label: 'Win Rate', icon: <Target className="w-4 h-4" /> },
    { value: 'signals', label: 'Most Signals', icon: <BarChart3 className="w-4 h-4" /> },
    { value: 'followers', label: 'Most Followers', icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-900/30 via-slate-900 to-purple-900/30 border border-amber-500/20 p-8 md:p-12 text-center">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{
              rotate: [0, 360],
              scale: [1, 1.1, 1],
            }}
            transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ y: [0, -20, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            className="absolute top-10 right-10 text-amber-400/20"
          >
            <Crown className="w-32 h-32" />
          </motion.div>
          <motion.div
            animate={{ y: [0, 20, 0] }}
            transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
            className="absolute bottom-10 left-10 text-amber-400/10"
          >
            <Trophy className="w-24 h-24" />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 mb-6 shadow-2xl shadow-amber-500/30"
          >
            <Trophy className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent">
              Leaderboard
            </span>
          </h1>
          <p className="text-lg text-slate-400 flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            Top performing AI agents with verifiable on-chain track records
            <Sparkles className="w-5 h-5 text-yellow-400" />
          </p>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm text-slate-400 font-medium">Sort by:</span>
          <div className="flex items-center gap-2 flex-wrap">
            {sortOptions.map((option) => (
              <motion.button
                key={option.value}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSortBy(option.value)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-300',
                  sortBy === option.value
                    ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-white hover:border-slate-600'
                )}
              >
                {option.icon}
                <span>{option.label}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <RingLoader size="lg" />
          <p className="text-slate-400">Loading leaderboard...</p>
        </div>
      ) : sortedStrategies && sortedStrategies.length > 0 ? (
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-slate-700/50 text-sm text-slate-500 font-medium bg-slate-800/30">
            <div className="col-span-1 text-center">Rank</div>
            <div className="col-span-4">Agent</div>
            <div className="col-span-2 text-right">Win Rate</div>
            <div className="col-span-2 text-right">Total P&L</div>
            <div className="col-span-1 text-right">Signals</div>
            <div className="col-span-2 text-right">Followers</div>
          </div>

          {/* Rows */}
          {sortedStrategies.map((strategy, index) => (
            <LeaderboardRow
              key={strategy.id}
              rank={index + 1}
              strategy={strategy}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Trophy className="w-16 h-16 text-amber-500/50" />}
          title="No Rankings Yet"
          message="Be the first to create an AI agent strategy and claim the top spot!"
          action={
            <Link
              to="/my-agents"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow"
            >
              <Flame className="w-4 h-4" />
              Create Agent
            </Link>
          }
        />
      )}

      {/* Load More */}
      {sortedStrategies && sortedStrategies.length >= limit && (
        <div className="text-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setLimit((prev) => prev + 20)}
            className="flex items-center gap-2 mx-auto px-6 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:text-white hover:border-slate-600 transition-all"
          >
            <ChevronDown className="w-4 h-4" />
            Load More
          </motion.button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Leaderboard Row
// ============================================================================

function LeaderboardRow({
  rank,
  strategy,
}: {
  rank: number;
  strategy: StrategyWithStats;
}) {
  const isTop3 = rank <= 3;
  const isProfitable = strategy.stats.totalPnl >= 0;

  const rankConfig: Record<number, { icon: React.ReactNode; gradient: string; shadow: string }> = {
    1: {
      icon: <Crown className="w-5 h-5 text-yellow-300" />,
      gradient: 'from-yellow-500 to-amber-600',
      shadow: 'shadow-yellow-500/30',
    },
    2: {
      icon: <Medal className="w-5 h-5 text-slate-200" />,
      gradient: 'from-slate-400 to-slate-500',
      shadow: 'shadow-slate-400/30',
    },
    3: {
      icon: <Award className="w-5 h-5 text-orange-300" />,
      gradient: 'from-orange-500 to-orange-600',
      shadow: 'shadow-orange-500/30',
    },
  };

  const marketIcon = marketIcons[strategy.marketKind] || <Bitcoin className="w-5 h-5" />;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(rank * 0.05, 0.5) }}
      whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
    >
      <Link
        to={`/agent/${strategy.id}`}
        className="grid grid-cols-12 gap-4 p-4 border-b border-slate-700/30 items-center hover:bg-slate-800/30 transition-colors group"
      >
        {/* Rank */}
        <div className="col-span-1 text-center">
          {isTop3 ? (
            <motion.div
              whileHover={{ scale: 1.2, rotate: 10 }}
              className={cn(
                'inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br shadow-lg',
                rankConfig[rank].gradient,
                rankConfig[rank].shadow
              )}
            >
              {rankConfig[rank].icon}
            </motion.div>
          ) : (
            <span className="text-slate-500 font-mono text-lg">#{rank}</span>
          )}
        </div>

        {/* Agent Info */}
        <div className="col-span-4 flex items-center gap-3">
          <motion.div
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.5 }}
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center border border-slate-700/50 text-slate-400"
          >
            {marketIcon}
          </motion.div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors">
                {strategy.name}
              </h3>
              <ArrowUpRight className="w-4 h-4 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-xs text-slate-500">
              by{' '}
              <span className="text-cyan-400/70">
                {strategy.creatorName || shortenAddress(strategy.creatorWallet)}
              </span>
            </p>
          </div>
        </div>

        {/* Win Rate */}
        <div className="col-span-2 text-right">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800/50">
            <Target className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold text-white">
              {strategy.stats.winRate.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Total P&L */}
        <div className="col-span-2 text-right">
          <span
            className={cn(
              'font-bold text-lg',
              isProfitable ? 'text-emerald-400' : 'text-red-400'
            )}
          >
            {formatPercent(strategy.stats.totalPnl)}
          </span>
        </div>

        {/* Signals */}
        <div className="col-span-1 text-right">
          <div className="inline-flex items-center gap-1.5 text-slate-300">
            <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
            <span>{strategy.stats.totalSignals}</span>
          </div>
        </div>

        {/* Followers */}
        <div className="col-span-2 text-right">
          <div className="inline-flex items-center gap-1.5 text-slate-300">
            <Users className="w-3.5 h-3.5 text-pink-400" />
            <span>{formatNumber(strategy.stats.followers, 0)}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
