// ============================================================================
// ExplorePage - Premium AI Agent Discovery with Amazing Animations
// ============================================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import AgentCard from '@/components/cards/AgentCard';
import StatCard from '@/components/cards/StatCard';
import PriceDisplay from '@/components/ui/PriceDisplay';
import { SkeletonCard, EmptyState } from '@/components/ui/Loading';
import { cn } from '@/lib/utils';
import {
  Search,
  Globe,
  Bitcoin,
  Trophy as Football,
  Target,
  TrendingUp,
  Flame,
  Clock,
  Users,
  Sparkles,
  ChevronDown,
  Bot,
} from 'lucide-react';

type MarketFilter = 'all' | 'crypto' | 'sports' | 'prediction';
type SortOption = 'popular' | 'winRate' | 'pnl' | 'newest';

export default function ExplorePage() {
  const [marketFilter, setMarketFilter] = useState<MarketFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch strategies
  const { data: strategies, isLoading } = useQuery({
    queryKey: ['strategies', 'public'],
    queryFn: () => api.getStrategies({ publicOnly: true }),
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: () => api.getStats(),
  });

  // Filter and sort strategies
  const filteredStrategies = strategies
    ?.filter((s) => {
      if (marketFilter !== 'all' && s.marketKind.toLowerCase() !== marketFilter) {
        return false;
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          s.name.toLowerCase().includes(query) ||
          s.description.toLowerCase().includes(query) ||
          s.creatorName?.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'winRate':
          return b.stats.winRate - a.stats.winRate;
        case 'pnl':
          return b.stats.totalPnl - a.stats.totalPnl;
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'popular':
        default:
          return b.stats.followers - a.stats.followers;
      }
    });

  const marketFilters: { value: MarketFilter; label: string; icon: typeof Globe }[] = [
    { value: 'all', label: 'All Markets', icon: Globe },
    { value: 'crypto', label: 'Crypto', icon: Bitcoin },
    { value: 'sports', label: 'Sports', icon: Football },
    { value: 'prediction', label: 'Predictions', icon: Target },
  ];

  const sortOptions: { value: SortOption; label: string; icon: typeof TrendingUp }[] = [
    { value: 'popular', label: 'Most Popular', icon: Users },
    { value: 'winRate', label: 'Win Rate', icon: TrendingUp },
    { value: 'pnl', label: 'Total P&L', icon: Flame },
    { value: 'newest', label: 'Newest', icon: Clock },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Section with Animated Background */}
      <div className="relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute top-20 left-10 w-72 h-72 bg-cyan-500/20 rounded-full blur-[100px]"
            animate={{
              x: [0, 50, 0],
              y: [0, 30, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-40 right-10 w-96 h-96 bg-purple-500/20 rounded-full blur-[120px]"
            animate={{
              x: [0, -30, 0],
              y: [0, 50, 0],
              scale: [1.2, 1, 1.2],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-20 left-1/2 w-80 h-80 bg-pink-500/15 rounded-full blur-[100px]"
            animate={{
              x: [0, 40, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative text-center py-12"
        >
          {/* Floating badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 mb-6"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-cyan-400">Powered by Linera</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight"
          >
            Discover{' '}
            <span className="relative">
              <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
                AI Agents
              </span>
              <motion.span
                className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 rounded-full"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
              />
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed"
          >
            Explore AI-powered trading strategies with{' '}
            <span className="text-white font-medium">verifiable on-chain track records</span>.
            Follow the best performers and mirror their signals.
          </motion.p>

          {/* Live Prices */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-8 flex justify-center"
          >
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/50 via-purple-500/50 to-pink-500/50 rounded-2xl blur-lg opacity-40 group-hover:opacity-60 transition-opacity" />
              <div className="relative flex items-center gap-4 px-6 py-4 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-700/50">
                <div className="flex items-center gap-2">
                  <motion.div
                    className="w-2 h-2 rounded-full bg-emerald-400"
                    animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Live</span>
                </div>
                <div className="w-px h-6 bg-slate-700" />
                <PriceDisplay showAll />
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <StatCard
            label="Active Agents"
            value={stats.totalStrategies}
            icon="bot"
            color="cyan"
            index={0}
          />
          <StatCard
            label="Total Signals"
            value={stats.totalSignals}
            icon="chart"
            color="purple"
            index={1}
          />
          <StatCard
            label="Live Signals"
            value={stats.openSignals}
            icon="zap"
            color="green"
            index={2}
          />
          <StatCard
            label="Win Rate"
            value={
              stats.totalWins + stats.totalLosses > 0
                ? `${((stats.totalWins / (stats.totalWins + stats.totalLosses)) * 100).toFixed(1)}%`
                : '—'
            }
            icon="trophy"
            color="orange"
            index={3}
          />
        </motion.div>
      )}

      {/* Filters Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="relative"
      >
        <div className="absolute -inset-1 bg-gradient-to-r from-slate-700/30 via-slate-600/20 to-slate-700/30 rounded-2xl blur-sm" />
        <div className="relative p-5 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-700/50">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Search */}
            <div className="relative w-full lg:w-auto group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full lg:w-72 pl-12 pr-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
              />
            </div>

            {/* Market Filter */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 w-full lg:w-auto scrollbar-hide">
              {marketFilters.map((filter, index) => {
                const Icon = filter.icon;
                return (
                  <motion.button
                    key={filter.value}
                    onClick={() => setMarketFilter(filter.value)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all duration-200',
                      marketFilter === filter.value
                        ? 'bg-gradient-to-r from-cyan-500/20 to-cyan-500/10 text-cyan-400 border border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                        : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-white hover:bg-slate-800/80'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{filter.label}</span>
                  </motion.button>
                );
              })}
            </div>

            {/* Sort Dropdown */}
            <div className="relative w-full lg:w-auto">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full lg:w-48 appearance-none px-4 py-3 pr-10 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all cursor-pointer"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value} className="bg-slate-900">
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Agents Grid */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </motion.div>
        ) : filteredStrategies && filteredStrategies.length > 0 ? (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredStrategies.map((strategy, index) => (
              <AgentCard
                key={strategy.id}
                id={strategy.id}
                name={strategy.name}
                description={strategy.description}
                marketKind={strategy.marketKind}
                creatorName={strategy.creatorName || 'Anonymous'}
                winRate={strategy.stats.winRate}
                totalPnl={strategy.stats.totalPnl}
                totalSignals={strategy.stats.totalSignals}
                followers={strategy.stats.followers}
                isPublic={strategy.isPublic}
                index={index}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <EmptyState
              icon={<Bot className="w-16 h-16 text-slate-600" />}
              title="No Agents Found"
              message={
                searchQuery
                  ? `No agents match "${searchQuery}". Try a different search.`
                  : 'Be the first to create an AI agent strategy!'
              }
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
