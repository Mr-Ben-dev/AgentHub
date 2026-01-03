// ============================================================================
// MyAgentsPage - Premium User Dashboard with Lucide Icons
// ============================================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { api } from '@/lib/api';
import { useChain, onChainApi } from '@/lib/chain';
import AgentCard from '@/components/cards/AgentCard';
import { RingLoader, EmptyState } from '@/components/ui/Loading';
import {
  Bot,
  Plus,
  Wallet,
  Shield,
  Rocket,
  User,
  FileText,
  Bitcoin,
  Target,
  Gamepad2,
  Globe,
  Lock,
  X,
  Sparkles,
  ArrowRight,
  Link as LinkIcon,
  Pen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MyAgentsPage() {
  const { primaryWallet, setShowAuthFlow } = useDynamicContext();
  const walletAddress = primaryWallet?.address;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // Check if user is registered
  const { data: strategistData, isLoading: loadingStrategist } = useQuery({
    queryKey: ['strategist', walletAddress],
    queryFn: () => api.getStrategist(walletAddress!),
    enabled: !!walletAddress,
  });

  // Fetch user's strategies
  const { data: strategies, isLoading: loadingStrategies } = useQuery({
    queryKey: ['my-strategies', walletAddress],
    queryFn: () => api.getStrategies({ creatorWallet: walletAddress }),
    enabled: !!walletAddress && strategistData?.isRegistered,
  });

  // Not connected
  if (!walletAddress) {
    return (
      <div className="py-20">
        <EmptyState
          icon={<Wallet className="w-16 h-16 text-cyan-500/50" />}
          title="Connect Your Wallet"
          message="Connect your wallet to view and create your AI agent strategies."
          action={
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAuthFlow(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-shadow"
            >
              <Wallet className="w-4 h-4" />
              Connect Wallet
            </motion.button>
          }
        />
      </div>
    );
  }

  // Loading
  if (loadingStrategist) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <RingLoader size="lg" />
        <p className="text-slate-400">Loading your profile...</p>
      </div>
    );
  }

  // Not registered
  if (!strategistData?.isRegistered) {
    return (
      <>
        <div className="py-20">
          <EmptyState
            icon={<Shield className="w-16 h-16 text-purple-500/50" />}
            title="Become a Strategist"
            message="Register as a strategist to create and publish AI agent strategies with verifiable on-chain track records."
            action={
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowRegisterModal(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-shadow"
              >
                <Shield className="w-4 h-4" />
                Register Now
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            }
          />
        </div>
        <RegisterModal
          isOpen={showRegisterModal}
          onClose={() => setShowRegisterModal(false)}
          wallet={walletAddress}
        />
      </>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-900/30 via-slate-900 to-cyan-900/30 border border-purple-500/20 p-8">
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              animate={{
                x: [0, 30, 0],
                y: [0, -20, 0],
              }}
              transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut' }}
              className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"
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
            <div className="flex items-center gap-4">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
                className="relative"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <Bot className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -inset-1 rounded-2xl border border-dashed border-purple-500/30 animate-spin-slow" />
              </motion.div>
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                  My Agents
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                </h1>
                <p className="text-slate-400">
                  Manage your AI trading strategies and signals
                </p>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-shadow"
            >
              <Plus className="w-5 h-5" />
              Create Agent
            </motion.button>
          </div>
        </div>

        {/* Strategies Grid */}
        {loadingStrategies ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <RingLoader />
            <p className="text-slate-400">Loading your agents...</p>
          </div>
        ) : strategies && strategies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {strategies.map((strategy, index) => (
              <AgentCard
                key={strategy.id}
                id={strategy.id}
                name={strategy.name}
                description={strategy.description}
                marketKind={strategy.marketKind}
                creatorName={strategistData.strategist?.name || 'You'}
                winRate={(strategy.stats?.winRate || 0) / 100}
                totalPnl={(strategy.stats?.totalPnl || 0) / 100}
                totalSignals={strategy.stats?.totalSignals || 0}
                followers={strategy.stats?.followers || 0}
                isPublic={strategy.isPublic}
                index={index}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Rocket className="w-16 h-16 text-cyan-500/50" />}
            title="Create Your First Agent"
            message="Start publishing AI-powered trading signals and build your verifiable track record on-chain."
            action={
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-shadow"
              >
                <Plus className="w-4 h-4" />
                Create Agent
              </motion.button>
            }
          />
        )}
      </div>

      <CreateAgentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        wallet={walletAddress}
      />
    </>
  );
}

// ============================================================================
// Register Modal
// ============================================================================

function RegisterModal({
  isOpen,
  onClose,
  wallet,
}: {
  isOpen: boolean;
  onClose: () => void;
  wallet: string;
}) {
  const queryClient = useQueryClient();
  const { primaryWallet } = useDynamicContext();
  const { isConnected: chainConnected, connect: connectToChain } = useChain();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [step, setStep] = useState<'form' | 'signing' | 'syncing'>('form');

  const mutation = useMutation({
    mutationFn: async () => {
      // Step 1: Ensure connected to Conway testnet
      setStep('signing');
      
      if (!primaryWallet) throw new Error('Wallet not connected');
      
      // Connect to chain if not already connected
      if (!chainConnected) {
        console.log('🔗 Connecting to Conway testnet...');
        await connectToChain();
      }
      
      console.log('📝 Registering strategist on-chain...');
      
      // Step 2: Call the REAL on-chain mutation via Linera GraphQL
      setStep('syncing');
      try {
        // Contract expects: registerStrategist(displayName: String!)
        const result = await onChainApi.registerStrategist(name);
        console.log('✅ ON-CHAIN registration result:', result);
        
        // Also sync to backend for caching/indexing
        await api.registerStrategist({ wallet, name, bio }).catch(console.warn);
        
        return result;
      } catch (chainError) {
        console.error('❌ On-chain registration failed:', chainError);
        // Fallback to backend only if chain fails
        console.log('⚠️ Falling back to backend registration...');
        return api.registerStrategist({ wallet, name, bio });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategist', wallet] });
      setStep('form');
      onClose();
    },
    onError: () => {
      setStep('form');
    },
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900/90 backdrop-blur-2xl rounded-3xl border border-slate-700/50 p-8 w-full max-w-md shadow-2xl shadow-purple-500/10"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Become a Strategist</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-slate-800/50 transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Chain connection warning */}
            {!chainConnected && (
              <div className="mb-4 p-3 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center gap-3">
                <LinkIcon className="w-5 h-5 text-orange-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-orange-300">Connect to Conway testnet first</p>
                </div>
                <button
                  onClick={() => connectToChain()}
                  className="px-3 py-1 text-xs bg-orange-500 text-white rounded-lg"
                >
                  Connect
                </button>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                  <User className="w-4 h-4" />
                  Display Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition-colors"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                  <FileText className="w-4 h-4" />
                  Bio (optional)
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about your trading expertise..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition-colors resize-none"
                />
              </div>
            </div>

            {/* Step indicator */}
            {step !== 'form' && (
              <div className="mt-4 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full"
                  />
                  <span className="text-sm text-cyan-300">
                    {step === 'signing' ? 'Please sign with your wallet...' : 'Syncing to backend...'}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-300 font-medium hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => mutation.mutate()}
                disabled={!name.trim() || mutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mutation.isPending ? (
                  <RingLoader size="sm" />
                ) : (
                  <>
                    <Pen className="w-4 h-4" />
                    Sign & Register
                  </>
                )}
              </motion.button>
            </div>

            {mutation.isError && (
              <p className="text-red-400 text-sm mt-4 text-center">
                {(mutation.error as Error).message}
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// Create Agent Modal
// ============================================================================

function CreateAgentModal({
  isOpen,
  onClose,
  wallet,
}: {
  isOpen: boolean;
  onClose: () => void;
  wallet: string;
}) {
  const queryClient = useQueryClient();
  const { primaryWallet } = useDynamicContext();
  const { isConnected: chainConnected, connect: connectToChain } = useChain();
  const [step, setStep] = useState<'form' | 'signing' | 'syncing'>('form');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    marketKind: 'Crypto',
    isPublic: true,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      // Step 1: Ensure connected to Conway testnet
      setStep('signing');
      
      if (!primaryWallet) throw new Error('Wallet not connected');
      
      // Connect to chain if not already connected
      if (!chainConnected) {
        console.log('🔗 Connecting to Conway testnet...');
        await connectToChain();
      }
      
      console.log('📝 Creating strategy on-chain...');
      
      // Step 2: Call the REAL on-chain mutation via Linera GraphQL
      // Contract expects: createAgentStrategy(name, description, marketKind, baseMarket, isPublic, isAiControlled)
      setStep('syncing');
      try {
        const strategyId = await onChainApi.createStrategy({
          name: formData.name,
          description: formData.description,
          marketKind: formData.marketKind,  // "Crypto" | "Sports" | "PredictionApp"
          baseMarket: formData.marketKind === 'Crypto' ? 'BTC/USD' : 'General',  // Default base market
          isPublic: formData.isPublic,
          isAiControlled: true,  // This is AgentHub so agents are AI-controlled
        });
        console.log('✅ ON-CHAIN strategy created! ID:', strategyId);
        
        // Also sync to backend for caching/indexing
        await api.createStrategy({
          ...formData,
          creatorWallet: wallet,
        }).catch(console.warn);
        
        return strategyId;
      } catch (chainError) {
        console.error('❌ On-chain strategy creation failed:', chainError);
        // Fallback to backend only if chain fails
        console.log('⚠️ Falling back to backend creation...');
        return api.createStrategy({
          ...formData,
          creatorWallet: wallet,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-strategies', wallet] });
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
      setFormData({ name: '', description: '', marketKind: 'Crypto', isPublic: true });
      setStep('form');
      onClose();
    },
    onError: () => {
      setStep('form');
    },
  });

  const marketOptions = [
    { value: 'Crypto', label: 'Crypto', icon: <Bitcoin className="w-5 h-5" /> },
    { value: 'Sports', label: 'Sports', icon: <Target className="w-5 h-5" /> },
    { value: 'PredictionApp', label: 'Predictions', icon: <Gamepad2 className="w-5 h-5" /> },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900/90 backdrop-blur-2xl rounded-3xl border border-slate-700/50 p-8 w-full max-w-lg shadow-2xl shadow-cyan-500/10"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
                  className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center"
                >
                  <Bot className="w-6 h-6 text-white" />
                </motion.div>
                <h2 className="text-2xl font-bold text-white">Create AI Agent</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-slate-800/50 transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Chain connection warning */}
            {!chainConnected && (
              <div className="mb-4 p-3 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center gap-3">
                <LinkIcon className="w-5 h-5 text-orange-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-orange-300">Connect to Conway testnet first</p>
                </div>
                <button
                  onClick={() => connectToChain()}
                  className="px-3 py-1 text-xs bg-orange-500 text-white rounded-lg"
                >
                  Connect
                </button>
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                  <Bot className="w-4 h-4" />
                  Agent Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., BTC Momentum Trader"
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                  <FileText className="w-4 h-4" />
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your agent's strategy..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors resize-none"
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-3 block">Market Type</label>
                <div className="grid grid-cols-3 gap-3">
                  {marketOptions.map((option) => (
                    <motion.button
                      key={option.value}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setFormData({ ...formData, marketKind: option.value })}
                      type="button"
                      className={cn(
                        'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all',
                        formData.marketKind === option.value
                          ? 'bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border-cyan-500/50 text-cyan-400'
                          : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600'
                      )}
                    >
                      {option.icon}
                      <span className="text-sm font-medium">{option.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-800/30 border border-slate-700/30">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setFormData({ ...formData, isPublic: !formData.isPublic })}
                  type="button"
                  className={cn(
                    'w-12 h-7 rounded-full transition-colors relative',
                    formData.isPublic ? 'bg-cyan-500' : 'bg-slate-700'
                  )}
                >
                  <motion.div
                    animate={{ x: formData.isPublic ? 22 : 2 }}
                    className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-lg"
                  />
                </motion.button>
                <div className="flex items-center gap-2">
                  {formData.isPublic ? (
                    <Globe className="w-4 h-4 text-cyan-400" />
                  ) : (
                    <Lock className="w-4 h-4 text-slate-400" />
                  )}
                  <span className={formData.isPublic ? 'text-white' : 'text-slate-400'}>
                    {formData.isPublic ? 'Public Agent' : 'Private Agent'}
                  </span>
                </div>
              </div>
            </div>

            {/* Step indicator */}
            {step !== 'form' && (
              <div className="mt-4 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full"
                  />
                  <span className="text-sm text-cyan-300">
                    {step === 'signing' ? 'Please sign with your wallet...' : 'Creating strategy...'}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-300 font-medium hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => mutation.mutate()}
                disabled={!formData.name.trim() || !formData.description.trim() || mutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mutation.isPending ? (
                  <RingLoader size="sm" />
                ) : (
                  <>
                    <Pen className="w-4 h-4" />
                    Sign & Create
                  </>
                )}
              </motion.button>
            </div>

            {mutation.isError && (
              <p className="text-red-400 text-sm mt-4 text-center">
                {(mutation.error as Error).message}
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
