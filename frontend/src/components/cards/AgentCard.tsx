// ============================================================================
// AgentCard - Premium Animated AI Agent Strategy Card
// ============================================================================

import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn, formatPercent, formatNumber } from '@/lib/utils';
import {
  Bitcoin,
  Trophy,
  Target,
  TrendingUp,
  TrendingDown,
  Users,
  Activity,
  ArrowUpRight,
  Sparkles,
  Bot,
} from 'lucide-react';

interface AgentCardProps {
  id: number;
  name: string;
  description: string;
  marketKind: string;
  creatorName: string;
  winRate: number;
  totalPnl: number;
  totalSignals: number;
  followers: number;
  isPublic: boolean;
  index?: number;
}

const marketIcons: Record<string, typeof Bitcoin> = {
  crypto: Bitcoin,
  sports: Trophy,
  predictionapp: Target,
};

const marketColors: Record<string, { bg: string; border: string; text: string }> = {
  crypto: {
    bg: 'from-orange-500/20 to-amber-500/10',
    border: 'border-orange-500/30',
    text: 'text-orange-400',
  },
  sports: {
    bg: 'from-emerald-500/20 to-green-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
  },
  predictionapp: {
    bg: 'from-purple-500/20 to-pink-500/10',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
  },
};

export default function AgentCard({
  id,
  name,
  description,
  marketKind,
  creatorName,
  winRate = 0,
  totalPnl = 0,
  totalSignals = 0,
  followers = 0,
  isPublic,
  index = 0,
}: AgentCardProps) {
  const isProfitable = totalPnl >= 0;
  const marketKey = (marketKind || 'crypto').toLowerCase();
  const Icon = marketIcons[marketKey] || Bot;
  const colors = marketColors[marketKey] || marketColors.crypto;

  // Use isPublic to show/hide indicator (suppress unused var warning)
  void isPublic;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        delay: index * 0.08, 
        duration: 0.5,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      whileHover={{ y: -8, scale: 1.02 }}
      className="group"
    >
      <Link to={`/agent/${id}`}>
        <div className="relative h-full overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/95 to-slate-800/90 backdrop-blur-xl border border-slate-700/50 transition-all duration-300 hover:border-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/10">
          {/* Animated gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          {/* Glowing orb effect on hover */}
          <motion.div
            className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-cyan-500/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          />

          <div className="relative p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {/* Animated Icon Container */}
                <motion.div
                  whileHover={{ rotate: 12, scale: 1.1 }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    'w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center border shadow-lg',
                    colors.bg,
                    colors.border
                  )}
                >
                  <Icon className={cn('w-6 h-6', colors.text)} />
                </motion.div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-lg group-hover:text-cyan-400 transition-colors">
                      {name}
                    </h3>
                    <ArrowUpRight className="w-4 h-4 text-slate-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    by {creatorName}
                  </p>
                </div>
              </div>

              {/* PnL Badge */}
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 + index * 0.08 }}
                className={cn(
                  'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-bold border',
                  isProfitable
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-red-500/20 text-red-400 border-red-500/30'
                )}
              >
                {isProfitable ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                {formatPercent(totalPnl)}
              </motion.div>
            </div>

            {/* Description */}
            <p className="text-sm text-slate-400 line-clamp-2 mb-5 leading-relaxed">{description}</p>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-xl bg-slate-800/50 border border-slate-700/30">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                  <p className="text-lg font-bold text-white">{winRate.toFixed(1)}%</p>
                </div>
                <p className="text-xs text-slate-500 font-medium">Win Rate</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-slate-800/50 border border-slate-700/30">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Activity className="w-3.5 h-3.5 text-purple-400" />
                  <p className="text-lg font-bold text-white">{totalSignals}</p>
                </div>
                <p className="text-xs text-slate-500 font-medium">Signals</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-slate-800/50 border border-slate-700/30">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Users className="w-3.5 h-3.5 text-pink-400" />
                  <p className="text-lg font-bold text-white">{formatNumber(followers, 0)}</p>
                </div>
                <p className="text-xs text-slate-500 font-medium">Followers</p>
              </div>
            </div>
          </div>

          {/* Animated bottom accent */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500"
            initial={{ scaleX: 0 }}
            whileHover={{ scaleX: 1 }}
            transition={{ duration: 0.4 }}
            style={{ originX: 0 }}
          />
        </div>
      </Link>
    </motion.div>
  );
}
