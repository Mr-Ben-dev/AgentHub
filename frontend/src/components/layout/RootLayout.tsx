// ============================================================================
// Root Layout - Premium App Shell with Lucide Icons & Stunning Animations
// ============================================================================

import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import {
  Compass,
  Radio,
  Trophy,
  Bot,
  Wallet,
  Menu,
  X,
  Sparkles,
  ChevronRight,
  Zap,
  LogOut,
  Link as LinkIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChain } from '@/lib/chain';

interface RootLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/', label: 'Explore', icon: Compass },
  { path: '/feed', label: 'Live Feed', icon: Radio },
  { path: '/rankings', label: 'Rankings', icon: Trophy },
  { path: '/my-agents', label: 'My Agents', icon: Bot },
];

export default function RootLayout({ children }: RootLayoutProps) {
  const location = useLocation();
  const { primaryWallet, setShowAuthFlow, handleLogOut } = useDynamicContext();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);
  
  // Chain connection hook
  const { isConnected: chainConnected, isConnecting: chainConnecting, connect: connectToChain, disconnect: disconnectFromChain } = useChain();

  const walletAddress = primaryWallet?.address;
  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : null;

  // Handle full logout - disconnect chain and wallet
  const handleFullLogout = async () => {
    try {
      // First disconnect from Linera chain
      await disconnectFromChain();
      // Then logout from Dynamic wallet
      await handleLogOut();
      setWalletMenuOpen(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-2xl border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <motion.div
                className="relative"
                whileHover={{ scale: 1.1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
              >
                <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
                  <Bot className="w-6 h-6 text-white" />
                  <motion.div
                    animate={{
                      opacity: [0.5, 1, 0.5],
                      scale: [1, 1.2, 1],
                    }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 blur-lg opacity-50"
                  />
                </div>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
                  className="absolute -inset-1 rounded-xl border border-dashed border-cyan-500/30"
                />
              </motion.div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                    AgentHub
                  </h1>
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                </div>
                <p className="text-[10px] text-slate-500 font-medium tracking-wide">
                  VERIFIABLE AI STRATEGIES
                </p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'relative px-4 py-2 rounded-xl font-medium transition-all duration-300',
                      isActive ? 'text-white' : 'text-slate-400 hover:text-white'
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 rounded-xl"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      <Icon className={cn('w-4 h-4', isActive && 'text-cyan-400')} />
                      <span>{item.label}</span>
                    </span>
                  </Link>
                );
              })}
            </nav>

            {/* Wallet Button */}
            <div className="flex items-center gap-3">
              {walletAddress ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-3 relative"
                >
                  <div className="hidden sm:flex flex-col items-end">
                    <div className="flex items-center gap-1">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className={cn(
                          "w-2 h-2 rounded-full",
                          chainConnected ? "bg-emerald-400" : chainConnecting ? "bg-yellow-400" : "bg-orange-400"
                        )}
                      />
                      <span className="text-xs text-slate-400">
                        {chainConnected ? 'On-Chain' : chainConnecting ? 'Connecting...' : 'Wallet Only'}
                      </span>
                    </div>
                    <span className="text-sm font-mono text-cyan-400">{shortAddress}</span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setWalletMenuOpen(!walletMenuOpen)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:text-white hover:border-slate-600 transition-all"
                  >
                    <Wallet className="w-4 h-4" />
                    <span className="hidden sm:inline text-sm font-medium">Wallet</span>
                  </motion.button>
                  
                  {/* Wallet Dropdown Menu */}
                  <AnimatePresence>
                    {walletMenuOpen && (
                      <>
                        {/* Backdrop */}
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setWalletMenuOpen(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 top-full mt-2 z-50 w-56 rounded-xl bg-slate-900 border border-slate-700/50 shadow-xl shadow-black/50 overflow-hidden"
                        >
                          <div className="p-3 border-b border-slate-800">
                            <p className="text-xs text-slate-500">Connected as</p>
                            <p className="text-sm font-mono text-cyan-400 truncate">{walletAddress}</p>
                          </div>
                          
                          <div className="p-2">
                            {/* Chain Connection Status */}
                            {!chainConnected && !chainConnecting && (
                              <button
                                onClick={() => {
                                  connectToChain();
                                  setWalletMenuOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-slate-800/50 transition-colors group"
                              >
                                <LinkIcon className="w-4 h-4 text-cyan-400" />
                                <div>
                                  <p className="text-sm text-white font-medium">Connect to Conway</p>
                                  <p className="text-xs text-slate-500">Enable on-chain operations</p>
                                </div>
                              </button>
                            )}
                            
                            {chainConnecting && (
                              <div className="flex items-center gap-3 px-3 py-2.5 text-slate-400">
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                  className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full"
                                />
                                <span className="text-sm">Connecting...</span>
                              </div>
                            )}
                            
                            {chainConnected && (
                              <div className="flex items-center gap-3 px-3 py-2.5 text-emerald-400">
                                <motion.div
                                  animate={{ scale: [1, 1.2, 1] }}
                                  transition={{ repeat: Infinity, duration: 2 }}
                                  className="w-2 h-2 rounded-full bg-emerald-400"
                                />
                                <span className="text-sm">Connected to Conway</span>
                              </div>
                            )}
                            
                            <div className="h-px bg-slate-800 my-2" />
                            
                            {/* Wallet Settings */}
                            <button
                              onClick={() => {
                                setShowAuthFlow(true);
                                setWalletMenuOpen(false);
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-slate-800/50 transition-colors"
                            >
                              <Wallet className="w-4 h-4 text-slate-400" />
                              <span className="text-sm text-slate-300">Wallet Settings</span>
                            </button>
                            
                            {/* Logout Button */}
                            <button
                              onClick={handleFullLogout}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-red-500/10 transition-colors group"
                            >
                              <LogOut className="w-4 h-4 text-slate-400 group-hover:text-red-400 transition-colors" />
                              <span className="text-sm text-slate-300 group-hover:text-red-400 transition-colors">Disconnect</span>
                            </button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAuthFlow(true)}
                  className="relative group flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-shadow"
                >
                  <Zap className="w-4 h-4" />
                  <span>Connect Wallet</span>
                  <motion.div
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 blur-xl opacity-50 group-hover:opacity-75 transition-opacity"
                  />
                </motion.button>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-xl hover:bg-slate-800/50 transition-colors"
              >
                <AnimatePresence mode="wait">
                  {mobileMenuOpen ? (
                    <motion.div
                      key="close"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                    >
                      <X className="w-6 h-6 text-white" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="menu"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                    >
                      <Menu className="w-6 h-6 text-white" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-slate-800/50 overflow-hidden bg-slate-900/90 backdrop-blur-xl"
            >
              <div className="px-4 py-4 space-y-2">
                {navItems.map((item, index) => {
                  const isActive = location.pathname === item.path;
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={item.path}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Link
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          'flex items-center justify-between px-4 py-3 rounded-xl transition-all',
                          isActive
                            ? 'bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 text-white'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={cn('w-5 h-5', isActive && 'text-cyan-400')} />
                          <span className="font-medium">{item.label}</span>
                        </div>
                        <ChevronRight className={cn('w-4 h-4', isActive && 'text-cyan-400')} />
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main className="relative flex-1 pt-20 pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="relative border-t border-slate-800/50 bg-slate-950/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <span className="text-slate-400 text-sm">
                Built on{' '}
                <a
                  href="https://linera.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
                >
                  Linera
                </a>
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <span>Verifiable AI Strategies</span>
              <span>•</span>
              <span>On-Chain Track Records</span>
              <span>•</span>
              <span>Conway Testnet</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
