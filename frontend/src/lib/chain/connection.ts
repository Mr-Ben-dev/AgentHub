// ============================================================================
// Chain Connection Manager - Handles Linera Conway testnet connectivity
// ============================================================================
// 
// Implements SESSION-BASED AUTO-SIGNING (Linera v0.15.8 SDK feature):
// - User signs ONCE when connecting wallet to add auto-signer as owner
// - All subsequent operations use the auto-signer (no popup required!)
// - This gives Web2-like UX while staying fully on-chain
// ============================================================================

import type { Signer } from '@linera/client';
import { ensureChainInitialized } from './init';
import { createAutoSignerSetup, type AutoSignerSetup } from './signer';

// Configuration from environment
const FAUCET_URL = import.meta.env.VITE_LINERA_FAUCET_URL || 'https://faucet.testnet-conway.linera.net';
const APPLICATION_ID = import.meta.env.VITE_LINERA_APP_ID || '';
const HUB_CHAIN_ID = import.meta.env.VITE_LINERA_CHAIN_ID || '';

// Connection state types
interface ChainConnection {
  client: any;
  wallet: any;
  faucet: any;
  chainId: string;
  address: string;
  signer: Signer;
  // Auto-signing additions
  autoSignerAddress: string;
  isAutoSignEnabled: boolean;
}

interface AppConnection {
  application: any;
  applicationId: string;
}

type ConnectionListener = () => void;

/**
 * ChainManager - Singleton manager for Linera chain connections
 * 
 * Implements the auto-signing pattern from Linera v0.15.8:
 * 1. Create random in-memory auto-signer
 * 2. Combine with wallet signer using Composite
 * 3. User signs ONCE to add auto-signer as chain owner
 * 4. All future operations use auto-signer (no popups!)
 */
class ChainManager {
  private connection: ChainConnection | null = null;
  private appConnection: AppConnection | null = null;
  private listeners: Set<ConnectionListener> = new Set();
  private connecting: boolean = false;

  /**
   * Connect to Conway testnet using a Dynamic.xyz wallet
   * Enables auto-signing for seamless UX
   */
  async connect(dynamicWallet: any): Promise<ChainConnection> {
    if (this.connection) {
      console.log('🔗 Already connected to Conway testnet');
      return this.connection;
    }

    if (this.connecting) {
      console.log('⏳ Connection in progress...');
      // Wait for connection to complete
      while (this.connecting) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (this.connection) return this.connection;
      throw new Error('Connection failed');
    }

    this.connecting = true;

    try {
      console.log('🔗 Connecting to Conway testnet with AUTO-SIGNING...');
      
      // Step 1: Initialize WASM
      await ensureChainInitialized();
      
      // Step 2: Import Linera client (includes signer module)
      const lineraModule = await import('@linera/client');
      const { Faucet, Client, signer: signerModule } = lineraModule;
      
      // Step 3: Connect to faucet
      console.log(`📡 Connecting to faucet: ${FAUCET_URL}`);
      const faucet = new Faucet(FAUCET_URL);
      
      // Step 4: Create Linera wallet (gets genesis config from faucet)
      console.log('💼 Creating Linera wallet...');
      const wallet = await faucet.createWallet();
      
      // Step 5: Get user's EVM address
      const userAddress = dynamicWallet.address?.toLowerCase();
      if (!userAddress) {
        throw new Error('Wallet address not available');
      }
      
      // Step 6: Claim a microchain for this user
      console.log(`⛓️ Claiming microchain for ${userAddress}...`);
      const chainId = await faucet.claimChain(wallet, userAddress);
      console.log(`✅ Claimed chain: ${chainId}`);
      
      // Step 7: Set up auto-signing (KEY INNOVATION!)
      // Creates random in-memory signer combined with wallet signer
      const autoSignerSetup: AutoSignerSetup = await createAutoSignerSetup(
        dynamicWallet, 
        signerModule
      );
      
      // Step 8: Create Linera client with composite signer
      console.log('🔗 Creating Linera client with auto-signing...');
      const client = await new Client(wallet, autoSignerSetup.compositeSigner);
      
      // Step 9: Add auto-signer as chain owner (ONE-TIME wallet signature!)
      console.log('✍️ Adding auto-signer as chain owner (one-time signature)...');
      const chain = await client.chain(chainId) as any; // Use 'any' for Linera SDK types
      
      let isAutoSignEnabled = false;
      try {
        // This is the ONLY wallet popup the user will see!
        await chain.addOwner(autoSignerSetup.autoSignerAddress);
        
        // Set auto-signer as default owner for automatic operations
        // Using 'any' cast because TypeScript doesn't have full Linera types
        await (wallet as any).setOwner(chainId, autoSignerSetup.autoSignerAddress);
        
        isAutoSignEnabled = true;
        console.log('✅ Auto-signing enabled! No more popups for this session.');
      } catch (autoSignError) {
        console.warn('⚠️ Could not enable auto-signing, using manual signing:', autoSignError);
        // Fall back to regular signing - still works, just with popups
      }

      this.connection = {
        client,
        wallet,
        faucet,
        chainId,
        address: userAddress,
        signer: autoSignerSetup.compositeSigner,
        autoSignerAddress: autoSignerSetup.autoSignerAddress,
        isAutoSignEnabled,
      };

      console.log('✅ Connected to Conway testnet!');
      console.log(`   Chain ID: ${chainId}`);
      console.log(`   Address: ${userAddress}`);
      console.log(`   Auto-Signer: ${autoSignerSetup.autoSignerAddress}`);
      console.log(`   Auto-Sign Enabled: ${isAutoSignEnabled}`);
      
      this.notifyListeners();
      
      return this.connection;
    } catch (error) {
      console.error('❌ Failed to connect to Conway testnet:', error);
      throw error;
    } finally {
      this.connecting = false;
    }
  }

  /**
   * Connect to the AgentHub application on-chain
   * Uses the USER's microchain to interact with the application
   */
  async connectApplication(applicationId?: string): Promise<AppConnection> {
    const appId = applicationId || APPLICATION_ID;
    
    if (!appId) {
      throw new Error('Application ID not configured. Set VITE_LINERA_APP_ID');
    }

    if (!this.connection) {
      throw new Error('Must connect wallet first');
    }

    if (this.appConnection?.applicationId === appId) {
      console.log('📱 Already connected to application');
      return this.appConnection;
    }

    try {
      console.log(`📱 Connecting to application: ${appId.slice(0, 16)}...`);
      
      // IMPORTANT: Use the USER's chain, not the hub chain
      // Users interact with applications through their own microchain
      const userChainId = this.connection.chainId;
      console.log(`⛓️ Opening user's chain: ${userChainId.slice(0, 16)}...`);
      const chain = await this.connection.client.chain(userChainId);
      
      // Get application - the app ID includes the hub chain info
      // so Linera knows where the app is deployed
      console.log(`📱 Getting application from user's chain...`);
      const application = await chain.application(appId);
      
      // Set up notification listener for new blocks
      chain.onNotification((notification: any) => {
        if (notification.reason?.NewBlock) {
          console.log('🔔 New block notification');
          this.notifyListeners();
        }
      });
      
      this.appConnection = {
        application,
        applicationId: appId,
      };

      console.log('✅ Connected to AgentHub application on user chain!');
      return this.appConnection;
    } catch (error) {
      console.error('❌ Failed to connect to application:', error);
      throw error;
    }
  }

  /**
   * Execute a GraphQL query against the application
   */
  async query<T>(graphqlQuery: string, variables?: Record<string, unknown>): Promise<T> {
    if (!this.appConnection) {
      throw new Error('Must connect to application first');
    }

    const payload = variables
      ? { query: graphqlQuery, variables }
      : { query: graphqlQuery };

    const result = await this.appConnection.application.query(JSON.stringify(payload));
    const parsed = JSON.parse(result);

    if (parsed.errors?.length > 0) {
      console.error('GraphQL Error:', parsed.errors[0].message);
      throw new Error(parsed.errors[0].message);
    }

    return parsed.data as T;
  }

  /**
   * Execute a GraphQL mutation against the application
   */
  async mutate<T>(graphqlMutation: string, variables?: Record<string, unknown>): Promise<T> {
    return this.query<T>(graphqlMutation, variables);
  }

  /**
   * Disconnect from the chain
   */
  disconnect(): void {
    this.connection = null;
    this.appConnection = null;
    console.log('🔌 Disconnected from Conway testnet');
    this.notifyListeners();
  }

  /**
   * Get current connection status
   */
  isConnected(): boolean {
    return this.connection !== null;
  }

  /**
   * Get current app connection status
   */
  isAppConnected(): boolean {
    return this.appConnection !== null;
  }

  /**
   * Get the connected wallet address
   */
  getAddress(): string | null {
    return this.connection?.address || null;
  }

  /**
   * Get the user's chain ID
   */
  getChainId(): string | null {
    return this.connection?.chainId || null;
  }

  /**
   * Get the hub chain ID (for cross-chain operations)
   */
  getHubChainId(): string {
    return HUB_CHAIN_ID;
  }

  /**
   * Get the application ID
   */
  getApplicationId(): string {
    return APPLICATION_ID;
  }

  /**
   * Check if auto-signing is enabled for the current session
   */
  isAutoSignEnabled(): boolean {
    return this.connection?.isAutoSignEnabled ?? false;
  }

  /**
   * Get the auto-signer address (for session-based automatic signing)
   */
  getAutoSignerAddress(): string | null {
    return this.connection?.autoSignerAddress ?? null;
  }

  /**
   * Subscribe to connection state changes
   */
  subscribe(listener: ConnectionListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}

// Export singleton instance
export const chainManager = new ChainManager();

// Export convenience functions
export const connectChain = (wallet: any) => chainManager.connect(wallet);
export const connectApp = (appId?: string) => chainManager.connectApplication(appId);
export const chainQuery = <T>(query: string, vars?: Record<string, unknown>) => 
  chainManager.query<T>(query, vars);
export const chainMutate = <T>(mutation: string, vars?: Record<string, unknown>) => 
  chainManager.mutate<T>(mutation, vars);
export const disconnectChain = () => chainManager.disconnect();
