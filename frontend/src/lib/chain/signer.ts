// ============================================================================
// Chain Signer - Adapts Dynamic.xyz wallet to Linera's Signer interface
// ============================================================================
// 
// This module implements Linera's Signer interface for:
// 1. EvmChainSigner - Uses Dynamic.xyz wallet for user-initiated signing
// 2. Auto-signing support - Combines with in-memory signer for session-based auto-signing
//
// AUTO-SIGNING PATTERN (from Linera v0.15.8 SDK):
// - User signs ONCE when connecting wallet
// - All subsequent operations use an in-memory auto-signer (no popups)
// - This gives Web2-like UX while staying fully on-chain
// ============================================================================

import type { Signer } from '@linera/client';

// Type for Dynamic.xyz wallet
interface DynamicWallet {
  address?: string;
  getWalletClient(): Promise<any>;
}

/**
 * Converts Uint8Array to hex string
 */
function uint8ArrayToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * EvmChainSigner - Implements Linera's Signer interface using Dynamic.xyz wallet
 * Uses personal_sign for message signing (required for Linera signature verification)
 * 
 * This signer is used for initial authentication and adding the auto-signer as owner.
 * After that, the auto-signer handles all subsequent operations.
 */
export class EvmChainSigner implements Signer {
  private dynamicWallet: DynamicWallet;
  private walletAddress: string;

  constructor(dynamicWallet: DynamicWallet) {
    this.dynamicWallet = dynamicWallet;
    if (!dynamicWallet.address) {
      throw new Error('Wallet address not available');
    }
    this.walletAddress = dynamicWallet.address.toLowerCase();
  }

  /**
   * Get the wallet address
   */
  address(): string {
    return this.walletAddress;
  }

  /**
   * Check if this signer can sign for the given owner
   */
  async containsKey(owner: string): Promise<boolean> {
    return owner.toLowerCase() === this.walletAddress;
  }

  /**
   * Sign a message using personal_sign
   * CRITICAL: Uses personal_sign directly to avoid double-hashing
   * that would occur with signMessage
   */
  async sign(owner: string, value: Uint8Array): Promise<string> {
    // Verify this signer owns the address
    const canSign = await this.containsKey(owner);
    if (!canSign) {
      throw new Error(`Cannot sign for owner ${owner}`);
    }

    try {
      // Get wallet client from Dynamic.xyz
      const walletClient = await this.dynamicWallet.getWalletClient();
      
      // Convert bytes to hex string for signing
      const messageHex = `0x${uint8ArrayToHex(value)}`;
      
      // Use personal_sign RPC method directly
      // This is required for Linera as it expects raw personal_sign signatures
      const signature = await walletClient.request({
        method: 'personal_sign',
        params: [messageHex, this.walletAddress],
      });

      console.log('✍️ Message signed successfully');
      return signature;
    } catch (error) {
      console.error('❌ Failed to sign message:', error);
      throw error;
    }
  }
}

/**
 * Create a new chain signer from a Dynamic.xyz wallet
 */
export function createChainSigner(dynamicWallet: DynamicWallet): EvmChainSigner {
  return new EvmChainSigner(dynamicWallet);
}

/**
 * Auto-signer info returned after setup
 */
export interface AutoSignerSetup {
  compositeSigner: Signer;
  autoSignerAddress: string;
  dynamicSigner: EvmChainSigner;
}

/**
 * Create a composite signer with auto-signing support
 * 
 * This is the key to session-based auto-signing:
 * 1. Creates a random in-memory signer (auto-signer) for automatic operations
 * 2. Combines it with the Dynamic wallet signer using Composite
 * 3. Returns everything needed to enable auto-signing on the chain
 * 
 * AUTO-SIGNING FLOW:
 * 1. User connects wallet (one-time)
 * 2. We create random auto-signer
 * 3. User signs ONCE to add auto-signer as chain owner
 * 4. All future operations use auto-signer (no popups!)
 * 
 * @param dynamicWallet - Connected Dynamic.xyz wallet
 * @param signerModule - The @linera/client signer module
 * @returns Composite signer and auto-signer details
 */
export async function createAutoSignerSetup(
  dynamicWallet: DynamicWallet,
  signerModule: { 
    PrivateKey: { createRandom: () => any };
    Composite: new (...signers: Signer[]) => Signer;
  }
): Promise<AutoSignerSetup> {
  console.log('🔑 Setting up auto-signing...');
  
  // Create the Dynamic wallet signer
  const dynamicSigner = new EvmChainSigner(dynamicWallet);
  
  // Create random in-memory auto-signer
  // This key exists only in memory for this session
  const autoSigner = signerModule.PrivateKey.createRandom();
  const autoSignerAddress = autoSigner.address();
  console.log(`   Auto-signer address: ${autoSignerAddress}`);
  
  // Combine signers: autoSigner FIRST (for automatic ops), dynamic SECOND (for user ops)
  // Composite tries each signer in order until one has the key for the owner
  // Since we'll set auto-signer as chain owner, it will handle most operations
  const compositeSigner = new signerModule.Composite(autoSigner, dynamicSigner);
  
  console.log('✅ Auto-signer setup complete');
  
  return {
    compositeSigner,
    autoSignerAddress,
    dynamicSigner,
  };
}
