// ============================================================================
// Loading components - Premium Animated Loaders with Lucide Icons
// ============================================================================

import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { Bot, Loader2 } from 'lucide-react';
import { ReactNode } from 'react';

// Premium orb loader with glow effect
export function OrbLoader({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  return (
    <div className="relative flex items-center justify-center">
      {/* Glow effect */}
      <motion.div
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.3, 0.1, 0.3],
        }}
        transition={{
          repeat: Infinity,
          duration: 2,
          ease: 'easeInOut',
        }}
        className={cn(
          sizes[size],
          'absolute rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 blur-xl'
        )}
      />
      {/* Main orb */}
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.7, 1, 0.7],
        }}
        transition={{
          repeat: Infinity,
          duration: 1.5,
          ease: 'easeInOut',
        }}
        className={cn(
          sizes[size],
          'rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 shadow-lg shadow-cyan-500/30'
        )}
      />
    </div>
  );
}

// Spinning ring loader
export function RingLoader({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  };

  return (
    <div className="flex items-center justify-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
      >
        <Loader2 className={cn(sizes[size], 'text-cyan-400')} />
      </motion.div>
    </div>
  );
}

// Dots loader with gradient
export function DotsLoader() {
  return (
    <div className="flex items-center justify-center gap-2">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{
            y: [0, -10, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            repeat: Infinity,
            duration: 0.8,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
          className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-cyan-400 to-purple-400"
        />
      ))}
    </div>
  );
}

// Premium skeleton card with shimmer
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn(
      'relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-xl p-6 space-y-4',
      className
    )}>
      {/* Shimmer overlay */}
      <motion.div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-slate-700/30 to-transparent"
        animate={{ translateX: ['-100%', '200%'] }}
        transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
      />
      
      <div className="relative flex items-center gap-3">
        <div className="w-14 h-14 rounded-xl bg-slate-800/80" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-2/3 rounded-lg bg-slate-800/80" />
          <div className="h-3 w-1/3 rounded-lg bg-slate-800/80" />
        </div>
      </div>
      <div className="relative h-10 rounded-lg bg-slate-800/80" />
      <div className="relative grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-slate-800/80" />
        ))}
      </div>
    </div>
  );
}

// Skeleton text line
export function SkeletonLine({ width = 'full' }: { width?: 'full' | '3/4' | '1/2' | '1/3' }) {
  const widths = {
    full: 'w-full',
    '3/4': 'w-3/4',
    '1/2': 'w-1/2',
    '1/3': 'w-1/3',
  };

  return (
    <div className="relative overflow-hidden">
      <motion.div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-slate-700/30 to-transparent"
        animate={{ translateX: ['-100%', '200%'] }}
        transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
      />
      <div className={cn('h-4 rounded-lg bg-slate-800/80', widths[width])} />
    </div>
  );
}

// Premium full page loader
export function PageLoader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-950/90 backdrop-blur-xl z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-8"
      >
        <div className="relative">
          <OrbLoader size="lg" />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
            className="absolute -inset-4 rounded-full border-2 border-dashed border-cyan-500/30"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
            className="absolute -inset-8 rounded-full border border-dashed border-purple-500/20"
          />
        </div>
        <motion.p
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-slate-400 font-medium text-lg"
        >
          {message}
        </motion.p>
      </motion.div>
    </div>
  );
}

// Premium empty state with icon support
export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon?: ReactNode;
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative flex flex-col items-center justify-center py-20 text-center"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 flex items-center justify-center opacity-30">
        <div className="w-64 h-64 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 blur-3xl" />
      </div>

      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        className="relative mb-6 p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50"
      >
        {icon || <Bot className="w-16 h-16 text-slate-500" />}
      </motion.div>
      <h3 className="relative text-2xl font-bold text-white mb-3">{title}</h3>
      <p className="relative text-slate-400 max-w-md mb-8 leading-relaxed">{message}</p>
      {action && <div className="relative">{action}</div>}
    </motion.div>
  );
}
