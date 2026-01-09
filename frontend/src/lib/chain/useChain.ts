// ============================================================================
// useChain Hook - React integration for Linera chain operations
// ============================================================================
// 
// Implements SESSION-BASED AUTO-SIGNING (Linera v0.15.8 SDK feature):
// - User signs ONCE when connecting wallet
// - All subsequent operations use auto-signer (no popups!)
// - Check isAutoSignEnabled to know if auto-signing is active
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { chainManager, connectChain, connectApp, disconnectChain } from './connection';

// ============================================================================
// Types
// ============================================================================

export interface ChainState {
  isConnected: boolean;
  isConnecting: boolean;
  isInitialized: boolean;
  chainId: string | null;
  error: string | null;
  // Auto-signing additions
  isAutoSignEnabled: boolean;
  autoSignerAddress: string | null;
}

export interface UseChainReturn extends ChainState {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  reconnect: () => Promise<void>;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * React hook for managing Linera chain connection with AUTO-SIGNING
 * 
 * AUTO-SIGNING FLOW:
 * 1. User connects wallet (triggers one-time signature)
 * 2. Auto-signer is added as chain owner
 * 3. All subsequent operations use auto-signer (no popups!)
 * 4. isAutoSignEnabled = true when working
 */
export function useChain(): UseChainReturn {
  const { primaryWallet, setShowAuthFlow } = useDynamicContext();
  
  const [state, setState] = useState<ChainState>({
    isConnected: chainManager.isConnected(),
    isConnecting: false,
    isInitialized: false,
    chainId: chainManager.getChainId(),
    error: null,
    isAutoSignEnabled: chainManager.isAutoSignEnabled(),
    autoSignerAddress: chainManager.getAutoSignerAddress(),
  });

  // Subscribe to chain state changes
  useEffect(() => {
    const unsubscribe = chainManager.subscribe(() => {
      setState(prev => ({
        ...prev,
        isConnected: chainManager.isConnected(),
        chainId: chainManager.getChainId(),
        isAutoSignEnabled: chainManager.isAutoSignEnabled(),
        autoSignerAddress: chainManager.getAutoSignerAddress(),
      }));
    });

    return unsubscribe;
  }, []);

  // Auto-connect when wallet is available
  useEffect(() => {
    if (primaryWallet && !state.isConnected && !state.isConnecting && !state.isInitialized) {
      // Attempt auto-connect on wallet ready
      handleConnect().then(() => {
        setState(prev => ({ ...prev, isInitialized: true }));
      });
    }
  }, [primaryWallet?.address]);

  // Clean up on wallet disconnect
  useEffect(() => {
    if (!primaryWallet && state.isConnected) {
      handleDisconnect();
    }
  }, [primaryWallet]);

  /**
   * Connect to Linera chain using current wallet
   */
  const handleConnect = useCallback(async () => {
    if (!primaryWallet) {
      setShowAuthFlow?.(true);
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      // Step 1: Connect to Conway testnet
      await connectChain(primaryWallet);
      
      // Step 2: Connect to AgentHub application (required for mutations)
      console.log('📱 Connecting to AgentHub application...');
      await connectApp();
      
      setState(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        chainId: chainManager.getChainId(),
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to chain';
      console.error('Chain connection failed:', error);
      setState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        error: errorMessage,
      }));
    }
  }, [primaryWallet, setShowAuthFlow]);

  /**
   * Disconnect from Linera chain
   */
  const handleDisconnect = useCallback(async () => {
    try {
      disconnectChain();
      setState({
        isConnected: false,
        isConnecting: false,
        isInitialized: false,
        chainId: null,
        error: null,
        isAutoSignEnabled: false,
        autoSignerAddress: null,
      });
    } catch (error) {
      console.error('Chain disconnect failed:', error);
    }
  }, []);

  /**
   * Reconnect to chain (disconnect then connect)
   */
  const handleReconnect = useCallback(async () => {
    await handleDisconnect();
    await handleConnect();
  }, [handleDisconnect, handleConnect]);

  return {
    ...state,
    connect: handleConnect,
    disconnect: handleDisconnect,
    reconnect: handleReconnect,
  };
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook for checking if chain operations are available
 */
export function useChainReady(): boolean {
  const { isConnected, isConnecting } = useChain();
  return isConnected && !isConnecting;
}

/**
 * Hook for getting chain connection status message
 */
export function useChainStatus(): string {
  const { isConnected, isConnecting, error } = useChain();
  
  if (error) return `Error: ${error}`;
  if (isConnecting) return 'Connecting to Conway testnet...';
  if (isConnected) return 'Connected to Conway';
  return 'Not connected';
}
