// ============================================================================
// SignalCard - Premium Signal Display with Lucide Icons
// ============================================================================

import { motion } from 'motion/react';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle,
  Radio,
  Bitcoin,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import {
  cn,
  formatPrice,
  formatRelativeTime,
} from '@/lib/utils';

interface SignalCardProps {
  id: number;
  market: string;
  direction: string;
  entryPrice: number;
  targetPrice?: number;
  exitPrice?: number;
  status: string;
  createdAt: string;
  resolvedAt?: string;
  confidence?: number;
  strategyName?: string;
  index?: number;
  showStrategy?: boolean;
}

export default function SignalCard({
  market,
  direction,
  entryPrice,
  targetPrice,
  exitPrice,
  status,
  createdAt,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  resolvedAt: _resolvedAt,
  confidence = 80,
  strategyName,
  index = 0,
  showStrategy = false,
}: SignalCardProps) {
  const isOpen = status.toLowerCase() === 'open';
  const isWin = status.toLowerCase().includes('win');
  const isLoss = status.toLowerCase().includes('loss');
  const isUp = direction.toLowerCase() === 'up' || direction.toLowerCase() === 'over' || direction.toLowerCase() === 'yes';

  // Calculate P&L if resolved
  const pnl = exitPrice
    ? isUp
      ? ((exitPrice - entryPrice) / entryPrice) * 100
      : ((entryPrice - exitPrice) / entryPrice) * 100
    : 0;

  const statusConfig = {
    open: {
      icon: <Radio className="w-4 h-4" />,
      text: 'LIVE',
      className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    },
    win: {
      icon: <CheckCircle2 className="w-4 h-4" />,
      text: 'WIN',
      className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    },
    loss: {
      icon: <XCircle className="w-4 h-4" />,
      text: 'LOSS',
      className: 'bg-red-500/20 text-red-400 border-red-500/30',
    },
  };

  const currentStatus = isOpen ? 'open' : isWin ? 'win' : 'loss';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.3), duration: 0.3 }}
      className="relative overflow-hidden rounded-2xl bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 p-4 hover:border-cyan-500/30 transition-all group"
    >
      {/* Animated background for open signals */}
      {isOpen && (
        <motion.div
          animate={{
            x: ['-100%', '200%'],
          }}
          transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/5 to-transparent"
        />
      )}

      <div className="relative flex items-center justify-between gap-4">
        {/* Left: Market & Direction */}
        <div className="flex items-center gap-3">
          <motion.div
            animate={isOpen ? { scale: [1, 1.1, 1], opacity: [1, 0.7, 1] } : {}}
            transition={{ repeat: Infinity, duration: 2 }}
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center',
              isOpen
                ? 'bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30'
                : isWin
                ? 'bg-emerald-500/20 border border-emerald-500/30'
                : isLoss
                ? 'bg-red-500/20 border border-red-500/30'
                : 'bg-slate-800/50 border border-slate-700/50'
            )}
          >
            <Bitcoin className={cn(
              'w-6 h-6',
              isOpen ? 'text-cyan-400' : isWin ? 'text-emerald-400' : isLoss ? 'text-red-400' : 'text-slate-400'
            )} />
          </motion.div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white">{market}</span>
              <span className={cn(
                'flex items-center gap-1 text-sm font-medium px-2 py-0.5 rounded-md',
                isUp
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/20 text-red-400'
              )}>
                {isUp ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                {direction.toUpperCase()}
              </span>
            </div>
            {showStrategy && strategyName && (
              <p className="text-xs text-slate-400 mt-0.5">{strategyName}</p>
            )}
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3" />
              {formatRelativeTime(createdAt)}
            </p>
          </div>
        </div>

        {/* Center: Prices */}
        <div className="hidden sm:flex items-center gap-4">
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-0.5">Entry</p>
            <p className="font-mono text-sm text-white">
              {entryPrice ? formatPrice(entryPrice) : 'Pending...'}
            </p>
          </div>
          {targetPrice && (
            <>
              <ArrowRight className="w-4 h-4 text-slate-600" />
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-0.5">Target</p>
                <p className="font-mono text-sm text-cyan-400">{formatPrice(targetPrice)}</p>
              </div>
            </>
          )}
          {exitPrice && (
            <>
              <ArrowRight className="w-4 h-4 text-slate-600" />
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-0.5">Exit</p>
                <p className={cn('font-mono text-sm', isWin ? 'text-emerald-400' : 'text-red-400')}>
                  {formatPrice(exitPrice)}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Right: Status & P&L */}
        <div className="flex items-center gap-3">
          {!isOpen && (
            <div className={cn('text-right font-bold text-lg', isWin ? 'text-emerald-400' : 'text-red-400')}>
              {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}%
            </div>
          )}
          <motion.div
            animate={isOpen ? { opacity: [1, 0.5, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium',
              statusConfig[currentStatus].className
            )}
          >
            {statusConfig[currentStatus].icon}
            {statusConfig[currentStatus].text}
          </motion.div>
        </div>
      </div>

      {/* Confidence bar for open signals */}
      {isOpen && (
        <div className="relative mt-4 pt-4 border-t border-slate-700/50">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
              Confidence
            </span>
            <span className="text-cyan-400 font-medium">{confidence}%</span>
          </div>
          <div className="h-2 bg-slate-800/50 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${confidence}%` }}
              transition={{ duration: 1, delay: 0.5 }}
              className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full relative"
            >
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              />
            </motion.div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
