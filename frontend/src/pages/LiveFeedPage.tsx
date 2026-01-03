// ============================================================================
// LiveFeedPage - Real-time Premium Feed with Lucide Icons
// ============================================================================

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { api, Signal } from '@/lib/api';
import SignalCard from '@/components/cards/SignalCard';
import PriceDisplay from '@/components/ui/PriceDisplay';
import { RingLoader, EmptyState } from '@/components/ui/Loading';
import {
  Radio,
  Activity,
  CheckCircle2,
  Circle,
  ListFilter,
  Wifi,
  WifiOff,
  Sparkles,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3002';

export default function LiveFeedPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_socket, setSocket] = useState<Socket | null>(null);
  const [liveUpdates, setLiveUpdates] = useState<Signal[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Fetch initial feed
  const { data: feedSignals, isLoading } = useQuery({
    queryKey: ['feed'],
    queryFn: () => api.getFeed(50),
  });

  // Socket.IO connection
  useEffect(() => {
    const newSocket = io(WS_URL, {
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('🔌 Connected to live feed');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Disconnected from live feed');
      setIsConnected(false);
    });

    // Listen for new signals
    newSocket.on('signal:new', (signal: Signal) => {
      console.log('📡 New signal:', signal);
      setLiveUpdates((prev) => [signal, ...prev.slice(0, 19)]);
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    });

    // Listen for resolved signals
    newSocket.on('signal:resolved', (signal: Signal) => {
      console.log('📡 Signal resolved:', signal);
      setLiveUpdates((prev) => {
        const updated = prev.map((s) => (s.id === signal.id ? signal : s));
        if (!prev.find((s) => s.id === signal.id)) {
          return [signal, ...updated.slice(0, 19)];
        }
        return updated;
      });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [queryClient]);

  // Combine live updates with fetched signals
  const allSignals = [...liveUpdates, ...(feedSignals || [])];

  // Remove duplicates
  const uniqueSignals = allSignals.filter(
    (signal, index, self) => self.findIndex((s) => s.id === signal.id) === index
  );

  // Filter signals
  const filteredSignals = uniqueSignals.filter((signal) => {
    if (filter === 'open') return signal.status.toLowerCase() === 'open';
    if (filter === 'resolved') return signal.status.toLowerCase() !== 'open';
    return true;
  });

  const filterOptions = [
    { value: 'all' as const, label: 'All Signals', icon: ListFilter },
    { value: 'open' as const, label: 'Open', icon: Circle },
    { value: 'resolved' as const, label: 'Resolved', icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 p-8">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{
              x: [0, 30, 0],
              y: [0, -20, 0],
            }}
            transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut' }}
            className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              x: [0, -20, 0],
              y: [0, 30, 0],
            }}
            transition={{ repeat: Infinity, duration: 10, ease: 'easeInOut' }}
            className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl"
          />
        </div>

        <div className="relative flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
                className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/30"
              >
                <Radio className="w-6 h-6 text-white" />
              </motion.div>
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                  Live Feed
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                </h1>
              </div>
            </div>

            {/* Connection Status */}
            <div className="flex items-center gap-3">
              <motion.div
                animate={isConnected ? { scale: [1, 1.3, 1], opacity: [1, 0.7, 1] } : {}}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium',
                  isConnected
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                )}
              >
                {isConnected ? (
                  <>
                    <Wifi className="w-4 h-4" />
                    <span>Connected to live updates</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4" />
                    <span>Connecting...</span>
                  </>
                )}
              </motion.div>
            </div>
          </div>

          {/* Price Display */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 px-6 py-4">
            <PriceDisplay showAll />
          </div>
        </div>
      </div>

      {/* Filters & Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          {filterOptions.map((option) => {
            const Icon = option.icon;
            const isActive = filter === option.value;
            return (
              <motion.button
                key={option.value}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setFilter(option.value)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-300',
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-white hover:border-slate-600'
                )}
              >
                <Icon className={cn('w-4 h-4', isActive && 'text-cyan-400')} />
                <span>{option.label}</span>
                {option.value === 'open' && isActive && (
                  <motion.span
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="flex h-2 w-2 rounded-full bg-emerald-400"
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        <div className="flex items-center gap-4 text-sm text-slate-400">
          <div className="flex items-center gap-2 bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-700/50">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>{filteredSignals.length} signals</span>
          </div>
        </div>
      </div>

      {/* Signals Feed */}
      {isLoading && !liveUpdates.length ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <RingLoader size="lg" />
          <p className="text-slate-400">Loading live feed...</p>
        </div>
      ) : filteredSignals.length > 0 ? (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredSignals.map((signal, index) => (
              <motion.div
                key={signal.id}
                initial={{ opacity: 0, x: -50, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                exit={{ opacity: 0, x: 50, height: 0 }}
                transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.3) }}
                layout
              >
                <SignalCard
                  id={signal.id}
                  market={signal.market}
                  direction={signal.direction}
                  entryPrice={signal.entryPrice}
                  targetPrice={signal.targetPrice}
                  exitPrice={signal.exitPrice}
                  status={signal.status}
                  createdAt={signal.createdAt}
                  resolvedAt={signal.resolvedAt}
                  confidence={signal.confidence}
                  strategyName={signal.strategyName}
                  index={index}
                  showStrategy
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <EmptyState
          icon={<TrendingUp className="w-16 h-16 text-slate-500" />}
          title="No Signals Yet"
          message="Live signals from AI agents will appear here in real-time as they are published."
          action={
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Clock className="w-4 h-4" />
              <span>Waiting for new signals...</span>
            </div>
          }
        />
      )}
    </div>
  );
}
