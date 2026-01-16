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
 * 1. Derives a DETERMINISTIC auto-signer from the user's wallet signature
 * 2. Combines it with the Dynamic wallet signer using Composite
 * 3. Returns everything needed to enable auto-signing on the chain
 * 
 * IMPORTANT: The auto-signer is derived deterministically from the wallet,
 * so the same wallet always produces the same auto-signer address.
 * This ensures on-chain registrations persist across browser sessions!
 * 
 * AUTO-SIGNING FLOW:
 * 1. User connects wallet (one-time)
 * 2. We derive deterministic auto-signer from wallet signature
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
    PrivateKey: { 
      createRandom: () => any;
      new (privateKeyHex: string): any;
    };
    Composite: new (...signers: Signer[]) => Signer;
  }
): Promise<AutoSignerSetup> {
  console.log('🔑 Setting up auto-signing...');
  
  // Create the Dynamic wallet signer
  const dynamicSigner = new EvmChainSigner(dynamicWallet);
  
  // IMPORTANT: Derive a DETERMINISTIC auto-signer from the user's wallet!
  // This ensures the same wallet always gets the same auto-signer address,
  // so on-chain registrations persist across browser sessions.
  const autoSigner = await deriveDeterministicAutoSigner(dynamicWallet, signerModule);
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

/**
 * Derive a deterministic auto-signer private key from the user's wallet.
 * 
 * The private key is derived by:
 * 1. Having the user sign a deterministic message
 * 2. Using the signature as the seed for the private key
 * 
 * This ensures:
 * - Same wallet → same auto-signer address (across sessions!)
 * - Different wallets → different auto-signer addresses
 * - On-chain registrations persist across browser sessions
 */
async function deriveDeterministicAutoSigner(
  dynamicWallet: DynamicWallet,
  signerModule: { 
    PrivateKey: { new (privateKeyHex: string): any };
  }
): Promise<any> {
  const walletAddress = dynamicWallet.address?.toLowerCase();
  if (!walletAddress) {
    throw new Error('Wallet address not available');
  }
  
  // Check localStorage for cached auto-signer key
  const cacheKey = `linera_auto_signer_${walletAddress}`;
  const cachedKey = localStorage.getItem(cacheKey);
  
  if (cachedKey) {
    console.log('   Using cached auto-signer key');
    return new signerModule.PrivateKey(cachedKey);
  }
  
  // Derive new key from wallet signature
  console.log('   Deriving auto-signer from wallet signature...');
  
  try {
    const walletClient = await dynamicWallet.getWalletClient();
    
    // Use a deterministic message that's unique to this wallet
    // The message includes a domain separator for security
    const message = `Linera AgentHub Auto-Signer Derivation\nWallet: ${walletAddress}\nDomain: agenthub.linera.net`;
    
    // Sign the message to get deterministic bytes
    const signature = await walletClient.request({
      method: 'personal_sign',
      params: [`0x${stringToHex(message)}`, walletAddress],
    });
    
    // Use the first 32 bytes of the signature as the private key
    // (Ethereum signatures are 65 bytes: r(32) + s(32) + v(1))
    const privateKeyHex = signature.slice(2, 66); // Remove '0x' and take 32 bytes (64 hex chars)
    
    // Cache the derived key for future sessions
    localStorage.setItem(cacheKey, privateKeyHex);
    console.log('   Auto-signer key derived and cached');
    
    return new signerModule.PrivateKey(privateKeyHex);
  } catch (error) {
    console.warn('   Could not derive deterministic key, falling back to random:', error);
    // Fallback: generate random key (won't persist across sessions)
    const randomSigner = signerModule.PrivateKey as any;
    return randomSigner.createRandom();
  }
}

/**
 * Convert string to hex
 */
function stringToHex(str: string): string {
  return Array.from(new TextEncoder().encode(str))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
