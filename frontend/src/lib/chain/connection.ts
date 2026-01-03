// ============================================================================
// Chain Connection Manager - Handles Linera Conway testnet connectivity
// ============================================================================

import type { Signer } from '@linera/client';
import { ensureChainInitialized } from './init';
import { createChainSigner } from './signer';

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
}

interface AppConnection {
  application: any;
  applicationId: string;
}

type ConnectionListener = () => void;

/**
 * ChainManager - Singleton manager for Linera chain connections
 */
class ChainManager {
  private connection: ChainConnection | null = null;
  private appConnection: AppConnection | null = null;
  private listeners: Set<ConnectionListener> = new Set();
  private connecting: boolean = false;

  /**
   * Connect to Conway testnet using a Dynamic.xyz wallet
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
      console.log('🔗 Connecting to Conway testnet...');
      
      // Step 1: Initialize WASM
      await ensureChainInitialized();
      
      // Step 2: Import Linera client
      const { Faucet, Client } = await import('@linera/client');
      
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
      
      // Step 7: Create signer and client
      const signer = createChainSigner(dynamicWallet);
      const client = await new Client(wallet, signer);
      
      this.connection = {
        client,
        wallet,
        faucet,
        chainId,
        address: userAddress,
        signer,
      };

      console.log('✅ Connected to Conway testnet!');
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
