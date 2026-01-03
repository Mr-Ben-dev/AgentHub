// ============================================================================
// AgentDetailPage - Premium Agent View with Lucide Icons
// ============================================================================

import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { api } from '@/lib/api';
import { onChainApi } from '@/lib/chain/operations';
import { useChain } from '@/lib/chain/useChain';
import SignalCard from '@/components/cards/SignalCard';
import StatCard from '@/components/cards/StatCard';
import { RingLoader, EmptyState } from '@/components/ui/Loading';
import {
  ArrowLeft,
  Bot,
  Globe,
  Lock,
  Calendar,
  User,
  Target,
  BarChart3,
  Trophy,
  AlertTriangle,
  Users,
  UserPlus,
  UserMinus,
  Bitcoin,
  Gamepad2,
  ListFilter,
  Circle,
  CheckCircle2,
  Inbox,
  Sparkles,
  Loader2,
  TrendingUp,
  TrendingDown,
  X,
  Zap,
  Send,
} from 'lucide-react';
import {
  cn,
  formatPercent,
  formatNumber,
  formatDate,
  shortenAddress,
} from '@/lib/utils';

const marketIcons: Record<string, React.ReactNode> = {
  crypto: <Bitcoin className="w-8 h-8" />,
  prediction: <Target className="w-8 h-8" />,
  gaming: <Gamepad2 className="w-8 h-8" />,
  sports: <Trophy className="w-8 h-8" />,
};

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const strategyId = parseInt(id || '0');
  const queryClient = useQueryClient();
  const { primaryWallet } = useDynamicContext();
  const walletAddress = primaryWallet?.address;
  const { isConnected, connect } = useChain();

  const [activeTab, setActiveTab] = useState<'all' | 'open' | 'closed'>('all');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_isFollowing, setIsFollowing] = useState(false);
  const [showSignalModal, setShowSignalModal] = useState(false);
  const [signalForm, setSignalForm] = useState({
    direction: 'Long' as 'Long' | 'Short',
    confidence: 75,
    horizonHours: 24,
  });

  // Fetch strategy details
  const { data: strategyData, isLoading: loadingStrategy, refetch: refetchStrategy } = useQuery({
    queryKey: ['strategy', strategyId],
    queryFn: () => api.getStrategy(strategyId),
    enabled: strategyId > 0,
  });

  // Fetch signals
  const { data: signals, isLoading: loadingSignals } = useQuery({
    queryKey: ['strategy-signals', strategyId, activeTab],
    queryFn: () => api.getStrategySignals(strategyId, activeTab === 'all' ? undefined : activeTab),
    enabled: strategyId > 0,
  });

  // Check if following (backend for initial state)
  const { data: followStatus, refetch: refetchFollowStatus } = useQuery({
    queryKey: ['following', walletAddress, strategyId],
    queryFn: () => api.checkFollowing(walletAddress!, strategyId),
    enabled: !!walletAddress && strategyId > 0,
  });

  // On-chain Follow/Unfollow mutation with wallet signing
  const followMutation = useMutation({
    mutationFn: async () => {
      if (!walletAddress) throw new Error('Wallet not connected');
      
      // Ensure connected to Conway testnet
      if (!isConnected) {
        console.log('🔗 Connecting to Conway for follow operation...');
        await connect();
      }
      
      const currentlyFollowing = followStatus?.isFollowing;
      
      if (currentlyFollowing) {
        console.log('🔗 ON-CHAIN: Unfollowing strategy', strategyId);
        await onChainApi.unfollowStrategy(strategyId);
        // Also update backend for consistency
        await api.unfollowStrategy(walletAddress, strategyId);
      } else {
        console.log('🔗 ON-CHAIN: Following strategy', strategyId);
        await onChainApi.followStrategy(strategyId, false, 0);
        // Also update backend for consistency
        await api.followStrategy(walletAddress, strategyId);
      }
      
      return !currentlyFollowing;
    },
    onSuccess: (nowFollowing) => {
      setIsFollowing(nowFollowing);
      queryClient.invalidateQueries({ queryKey: ['following', walletAddress, strategyId] });
      queryClient.invalidateQueries({ queryKey: ['strategy', strategyId] });
      // Refetch to get updated data
      setTimeout(() => {
        refetchStrategy();
        refetchFollowStatus();
      }, 1000);
    },
    onError: (error) => {
      console.error('Follow/Unfollow error:', error);
    },
  });

  // On-chain Publish Signal mutation
  const publishSignalMutation = useMutation({
    mutationFn: async () => {
      if (!walletAddress) throw new Error('Wallet not connected');
      
      // Ensure connected to Conway testnet
      if (!isConnected) {
        console.log('🔗 Connecting to Conway for signal operation...');
        await connect();
      }
      
      console.log('🔗 ON-CHAIN: Publishing signal for strategy', strategyId);
      
      // Convert confidence % to basis points (0-10000)
      const confidenceBps = signalForm.confidence * 100;
      // Convert hours to seconds
      const horizonSecs = signalForm.horizonHours * 3600;
      
      // Publish on-chain
      const signalId = await onChainApi.publishSignal({
        strategyId,
        direction: signalForm.direction,
        horizonSecs,
        confidenceBps,
      });
      
      // Also create in backend for display
      // Direction mapping: Long->Up, Short->Down
      const backendDirection = signalForm.direction === 'Long' ? 'Up' : 'Down';
      await api.createSignal({
        walletAddress: walletAddress,
        strategyId,
        direction: backendDirection,
        horizonSecs,
        confidenceBps,
      });
      
      return signalId;
    },
    onSuccess: (signalId) => {
      console.log('✅ Signal published:', signalId);
      setShowSignalModal(false);
      queryClient.invalidateQueries({ queryKey: ['strategy-signals', strategyId] });
      queryClient.invalidateQueries({ queryKey: ['strategy', strategyId] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
    onError: (error) => {
      console.error('Publish signal error:', error);
    },
  });

  if (loadingStrategy) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <RingLoader size="lg" />
        <p className="text-slate-400">Loading agent details...</p>
      </div>
    );
  }

  if (!strategyData) {
    return (
      <EmptyState
        icon={<AlertTriangle className="w-16 h-16 text-red-500/50" />}
        title="Agent Not Found"
        message="This AI agent strategy doesn't exist or has been removed."
        action={
          <Link
            to="/"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Explore Agents
          </Link>
        }
      />
    );
  }

  const { strategy, stats } = strategyData;
  const isOwner = walletAddress?.toLowerCase() === strategy?.creatorWallet?.toLowerCase();
  const marketIcon = marketIcons[strategy?.marketKind?.toLowerCase()] || <Bitcoin className="w-8 h-8" />;
  
  // Safe stats with defaults
  const safeStats = {
    totalSignals: stats?.totalSignals ?? 0,
    wins: stats?.wins ?? 0,
    losses: stats?.losses ?? 0,
    winRate: stats?.winRate ?? 0,
    totalPnl: stats?.totalPnl ?? 0,
    avgPnl: stats?.avgPnl ?? 0,
    bestWin: stats?.bestWin ?? 0,
    worstLoss: stats?.worstLoss ?? 0,
    followers: stats?.followers ?? 0,
  };

  const tabOptions = [
    { value: 'all' as const, label: 'All Signals', icon: ListFilter },
    { value: 'open' as const, label: 'Open', icon: Circle },
    { value: 'closed' as const, label: 'Closed', icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Explore
      </Link>

      {/* Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 p-8"
      >
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{
              x: [0, 30, 0],
              y: [0, -20, 0],
            }}
            transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut' }}
            className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              x: [0, -20, 0],
              y: [0, 30, 0],
            }}
            transition={{ repeat: Infinity, duration: 10, ease: 'easeInOut' }}
            className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"
          />
        </div>

        <div className="relative flex flex-col md:flex-row gap-6 items-start">
          {/* Agent Icon */}
          <motion.div
            whileHover={{ rotate: 360, scale: 1.1 }}
            transition={{ duration: 0.5 }}
            className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center border border-slate-700/50 text-cyan-400"
          >
            {marketIcon}
          </motion.div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                {strategy.name}
                <Sparkles className="w-5 h-5 text-yellow-400" />
              </h1>
              {strategy.isPublic ? (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-sm font-medium">
                  <Globe className="w-3.5 h-3.5" />
                  Public
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-sm font-medium">
                  <Lock className="w-3.5 h-3.5" />
                  Private
                </span>
              )}
            </div>
            <p className="text-slate-400 mb-4 max-w-2xl">{strategy.description}</p>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <User className="w-4 h-4" />
                Created by{' '}
                <span className="text-cyan-400 font-mono">
                  {strategy.creatorName || shortenAddress(strategy.creatorWallet)}
                </span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                Since {formatDate(strategy.createdAt)}
              </span>
              <span>•</span>
              <span className="capitalize flex items-center gap-1.5">
                <Bot className="w-4 h-4" />
                {strategy.marketKind}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 items-end">
            {/* Publish Signal Button - Only for owner */}
            {isOwner && walletAddress && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowSignalModal(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all"
              >
                <Zap className="w-4 h-4" />
                Publish Signal
              </motion.button>
            )}
            {!isOwner && walletAddress && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => followMutation.mutate()}
                disabled={followMutation.isPending}
                className={cn(
                  'flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all',
                  followStatus?.isFollowing
                    ? 'bg-slate-800/50 border border-red-500/50 text-red-400 hover:bg-red-500/10'
                    : 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40'
                )}
              >
                {followMutation.isPending ? (
                  <RingLoader size="sm" />
                ) : followStatus?.isFollowing ? (
                  <>
                    <UserMinus className="w-4 h-4" />
                    Unfollow
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Follow Agent
                  </>
                )}
              </motion.button>
            )}
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Users className="w-4 h-4" />
              {formatNumber(safeStats.followers, 0)} followers
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          label="Total P&L"
          value={formatPercent(safeStats.totalPnl)}
          icon="chart"
          color={safeStats.totalPnl >= 0 ? 'green' : 'orange'}
          index={0}
        />
        <StatCard
          label="Win Rate"
          value={`${safeStats.winRate.toFixed(1)}%`}
          icon="target"
          color="cyan"
          index={1}
        />
        <StatCard
          label="Total Signals"
          value={safeStats.totalSignals}
          icon="activity"
          color="purple"
          index={2}
        />
        <StatCard
          label="Wins / Losses"
          value={`${safeStats.wins} / ${safeStats.losses}`}
          icon="zap"
          color="pink"
          index={3}
        />
        <StatCard
          label="Best Win"
          value={formatPercent(safeStats.bestWin)}
          icon="trophy"
          color="green"
          index={4}
        />
        <StatCard
          label="Worst Loss"
          value={formatPercent(safeStats.worstLoss)}
          icon="flame"
          color="orange"
          index={5}
        />
      </div>

      {/* Signals Section */}
      <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
        {/* Tab Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            Signals
          </h2>
          <div className="flex gap-2">
            {tabOptions.map((tab) => {
              const Icon = tab.icon;
              return (
                <motion.button
                  key={tab.value}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveTab(tab.value)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all',
                    activeTab === tab.value
                      ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-white bg-slate-800/50 border border-slate-700/50'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Signals List */}
        {loadingSignals ? (
          <div className="flex flex-col items-center justify-center py-10 gap-4">
            <RingLoader />
            <p className="text-slate-400">Loading signals...</p>
          </div>
        ) : signals && signals.length > 0 ? (
          <div className="space-y-3">
            {signals.map((signal, index) => (
              <SignalCard
                key={signal.id}
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
                index={index}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Inbox className="w-16 h-16 text-slate-500" />}
            title="No Signals Yet"
            message={
              activeTab === 'all'
                ? "This agent hasn't published any signals yet."
                : `No ${activeTab} signals at the moment.`
            }
          />
        )}
      </div>

      {/* Publish Signal Modal */}
      <AnimatePresence>
        {showSignalModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowSignalModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-700/50 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Publish Signal</h2>
                      <p className="text-sm text-slate-400">On-chain trading prediction</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowSignalModal(false)}
                    className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Form */}
              <div className="p-6 space-y-6">
                {/* Direction */}
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-3">Direction</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setSignalForm(f => ({ ...f, direction: 'Long' }))}
                      className={cn(
                        'flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 font-semibold transition-all',
                        signalForm.direction === 'Long'
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                          : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                      )}
                    >
                      <TrendingUp className="w-5 h-5" />
                      Long (Bullish)
                    </button>
                    <button
                      onClick={() => setSignalForm(f => ({ ...f, direction: 'Short' }))}
                      className={cn(
                        'flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 font-semibold transition-all',
                        signalForm.direction === 'Short'
                          ? 'border-red-500 bg-red-500/20 text-red-400'
                          : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                      )}
                    >
                      <TrendingDown className="w-5 h-5" />
                      Short (Bearish)
                    </button>
                  </div>
                </div>

                {/* Confidence */}
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-3">
                    Confidence: <span className="text-white font-bold">{signalForm.confidence}%</span>
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={signalForm.confidence}
                    onChange={(e) => setSignalForm(f => ({ ...f, confidence: parseInt(e.target.value) }))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-700"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>Low (10%)</span>
                    <span>High (100%)</span>
                  </div>
                </div>

                {/* Time Horizon */}
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-3">Time Horizon</label>
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { value: 0.05, label: '3m' },  // 3 minutes for testing
                      { value: 1, label: '1h' },
                      { value: 4, label: '4h' },
                      { value: 24, label: '24h' },
                      { value: 72, label: '72h' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setSignalForm(f => ({ ...f, horizonHours: option.value }))}
                        className={cn(
                          'px-3 py-2 rounded-lg border text-sm font-medium transition-all',
                          signalForm.horizonHours === option.value
                            ? 'border-cyan-500 bg-cyan-500/20 text-cyan-400'
                            : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                  <p className="text-sm text-slate-400 mb-2">Signal Preview</p>
                  <p className="text-white">
                    <span className={signalForm.direction === 'Long' ? 'text-emerald-400' : 'text-red-400'}>
                      {signalForm.direction === 'Long' ? '📈 LONG' : '📉 SHORT'}
                    </span>
                    {' '}on {strategyData?.strategy?.marketKind === 'Crypto' ? 'BTC-USD' : 'Market'}
                    {' '}with <span className="text-cyan-400">{signalForm.confidence}%</span> confidence
                    {' '}for <span className="text-purple-400">
                      {signalForm.horizonHours < 1 
                        ? `${Math.round(signalForm.horizonHours * 60)}min` 
                        : `${signalForm.horizonHours}h`}
                    </span>
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-slate-700/50 bg-slate-800/30">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => publishSignalMutation.mutate()}
                  disabled={publishSignalMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg hover:shadow-emerald-500/25 transition-all disabled:opacity-50"
                >
                  {publishSignalMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Publishing On-Chain...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Publish Signal (Sign with Wallet)
                    </>
                  )}
                </motion.button>
                <p className="text-xs text-slate-500 text-center mt-3">
                  This signal will be permanently recorded on Linera blockchain
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
