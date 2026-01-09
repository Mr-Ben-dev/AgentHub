// ============================================================================
// SignalCard - Premium Signal Display with Lucide Icons
// ============================================================================

import { useState, useEffect } from 'react';
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
  Timer,
} from 'lucide-react';
import {
  cn,
  formatPrice,
  formatRelativeTime,
} from '@/lib/utils';

interface SignalCardProps {
  id: number | string;
  market: string;
  direction: string;
  entryPrice: number;
  targetPrice?: number;
  exitPrice?: number;
  status: string;
  result?: string; // 'win' | 'lose' | 'push'
  createdAt: string;
  expiresAt?: string;
  resolvedAt?: string;
  confidence?: number;
  pnlPercent?: number;
  strategyName?: string;
  index?: number;
  showStrategy?: boolean;
}

// Countdown hook
function useCountdown(expiresAt: string | undefined, isOpen: boolean) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!expiresAt || !isOpen) {
      setTimeLeft('');
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const expires = new Date(expiresAt).getTime();
      const diff = expires - now;

      if (diff <= 0) {
        setTimeLeft('Resolving...');
        setIsExpired(true);
        return;
      }

      setIsExpired(false);

      // Format time remaining
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, isOpen]);

  return { timeLeft, isExpired };
}

export default function SignalCard({
  market,
  direction,
  entryPrice,
  targetPrice,
  exitPrice,
  status,
  result, // 'win' | 'lose' | 'push' from backend
  createdAt,
  expiresAt,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  resolvedAt: _resolvedAt,
  confidence = 80,
  pnlPercent,
  strategyName,
  index = 0,
  showStrategy = false,
}: SignalCardProps) {
  const isOpen = status.toLowerCase() === 'open';
  
  // Use 'result' field from backend for win/lose determination (not 'status')
  // 'status' is 'open' | 'resolved' | 'cancelled'
  // 'result' is 'win' | 'lose' | 'push' (only set when resolved)
  const isWin = result?.toLowerCase() === 'win';
  const isLoss = result?.toLowerCase() === 'lose' || result?.toLowerCase() === 'loss';
  
  const isUp = direction.toLowerCase() === 'up' || direction.toLowerCase() === 'over' || direction.toLowerCase() === 'yes' || direction.toLowerCase() === 'long';

  const { timeLeft, isExpired } = useCountdown(expiresAt, isOpen);

  // Calculate P&L if resolved - use pnlPercent from backend if available
  const pnl = pnlPercent !== undefined
    ? pnlPercent
    : exitPrice
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
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatRelativeTime(createdAt)}
              </p>
              {/* Countdown Timer for Open Signals */}
              {isOpen && timeLeft && (
                <p className={cn(
                  "text-xs flex items-center gap-1 px-1.5 py-0.5 rounded",
                  isExpired
                    ? "text-yellow-400 bg-yellow-500/20"
                    : "text-cyan-400 bg-cyan-500/20"
                )}>
                  <Timer className="w-3 h-3" />
                  {timeLeft}
                </p>
              )}
            </div>
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
