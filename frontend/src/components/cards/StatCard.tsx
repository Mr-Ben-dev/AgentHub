// ============================================================================
// StatCard - Premium animated statistic display with Lucide icons
// ============================================================================

import { motion } from 'motion/react';
import { 
  Bot, 
  BarChart3, 
  Zap, 
  Trophy, 
  TrendingUp, 
  TrendingDown,
  Users,
  Activity,
  Target,
  Flame,
  type LucideIcon 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  icon?: 'bot' | 'chart' | 'zap' | 'trophy' | 'users' | 'activity' | 'target' | 'flame';
  color?: 'cyan' | 'purple' | 'green' | 'orange' | 'pink';
  index?: number;
}

const iconMap: Record<string, LucideIcon> = {
  bot: Bot,
  chart: BarChart3,
  zap: Zap,
  trophy: Trophy,
  users: Users,
  activity: Activity,
  target: Target,
  flame: Flame,
};

const colorClasses = {
  cyan: {
    bg: 'from-cyan-500/20 via-cyan-500/10 to-transparent',
    border: 'border-cyan-500/30 hover:border-cyan-400/50',
    icon: 'text-cyan-400',
    glow: 'shadow-cyan-500/20',
    pulse: 'bg-cyan-400',
  },
  purple: {
    bg: 'from-purple-500/20 via-purple-500/10 to-transparent',
    border: 'border-purple-500/30 hover:border-purple-400/50',
    icon: 'text-purple-400',
    glow: 'shadow-purple-500/20',
    pulse: 'bg-purple-400',
  },
  green: {
    bg: 'from-emerald-500/20 via-emerald-500/10 to-transparent',
    border: 'border-emerald-500/30 hover:border-emerald-400/50',
    icon: 'text-emerald-400',
    glow: 'shadow-emerald-500/20',
    pulse: 'bg-emerald-400',
  },
  orange: {
    bg: 'from-orange-500/20 via-orange-500/10 to-transparent',
    border: 'border-orange-500/30 hover:border-orange-400/50',
    icon: 'text-orange-400',
    glow: 'shadow-orange-500/20',
    pulse: 'bg-orange-400',
  },
  pink: {
    bg: 'from-pink-500/20 via-pink-500/10 to-transparent',
    border: 'border-pink-500/30 hover:border-pink-400/50',
    icon: 'text-pink-400',
    glow: 'shadow-pink-500/20',
    pulse: 'bg-pink-400',
  },
};

export default function StatCard({
  label,
  value,
  change,
  icon = 'chart',
  color = 'cyan',
  index = 0,
}: StatCardProps) {
  const hasChange = typeof change === 'number';
  const isPositiveChange = hasChange && change >= 0;
  const Icon = iconMap[icon] || BarChart3;
  const colors = colorClasses[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        delay: index * 0.1, 
        duration: 0.5,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      whileHover={{ 
        scale: 1.03, 
        y: -4,
        transition: { duration: 0.2 }
      }}
      className={cn(
        'group relative overflow-hidden rounded-2xl border backdrop-blur-xl',
        'bg-gradient-to-br from-slate-900/90 to-slate-800/50',
        colors.border,
        'transition-all duration-300',
        'hover:shadow-lg',
        colors.glow
      )}
    >
      {/* Animated gradient background */}
      <div className={cn(
        'absolute inset-0 bg-gradient-to-br opacity-50',
        colors.bg
      )} />
      
      {/* Animated orb */}
      <motion.div 
        className={cn(
          'absolute -right-8 -top-8 w-32 h-32 rounded-full blur-3xl opacity-30',
          colors.bg
        )}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <div className="relative p-6">
        {/* Header with Icon */}
        <div className="flex items-center justify-between mb-4">
          <motion.div
            className={cn(
              'p-3 rounded-xl bg-gradient-to-br',
              colors.bg,
              'border',
              colors.border
            )}
            whileHover={{ rotate: [0, -10, 10, 0] }}
            transition={{ duration: 0.5 }}
          >
            <Icon className={cn('w-5 h-5', colors.icon)} strokeWidth={2} />
          </motion.div>
          
          {hasChange && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className={cn(
                'flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full',
                isPositiveChange 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              )}
            >
              {isPositiveChange ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {Math.abs(change).toFixed(1)}%
            </motion.div>
          )}
        </div>

        {/* Value with counting animation */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 + index * 0.1 }}
        >
          <p className="text-3xl font-bold text-white mb-1 tracking-tight">
            {value}
          </p>
        </motion.div>

        {/* Label */}
        <p className="text-sm text-slate-400 font-medium">{label}</p>

        {/* Bottom accent line */}
        <motion.div
          className={cn('absolute bottom-0 left-0 h-0.5', colors.pulse)}
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ delay: 0.4 + index * 0.1, duration: 0.8 }}
        />
      </div>
    </motion.div>
  );
}
