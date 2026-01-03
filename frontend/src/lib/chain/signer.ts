// ============================================================================
// Chain Signer - Adapts Dynamic.xyz wallet to Linera's Signer interface
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
export function createChainSigner(dynamicWallet: DynamicWallet): Signer {
  return new EvmChainSigner(dynamicWallet);
}
