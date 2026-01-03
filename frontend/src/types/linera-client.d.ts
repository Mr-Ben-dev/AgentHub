// ============================================================================
// Type declarations for @linera/client WASM module
// Based on the actual package exports from @linera/client v0.15.8
// ============================================================================

declare module '@linera/client' {
  // Named export for WASM initialization
  export function initialize(): Promise<void>;
  
  export class Faucet {
    constructor(url: string);
    createWallet(): Promise<Wallet>;
    claimChain(wallet: Wallet, owner: any): Promise<string>;
    free(): void;
  }
  
  export class Wallet {
    free(): void;
  }
  
  export class Client {
    constructor(wallet: Wallet, signer: Signer, options?: any);
    onNotification(handler: (notification: any) => void): void;
    chain(chainId: string): Promise<Chain>;
    free(): void;
  }
  
  export class Application {
    query(query: string, blockHash?: string | null): Promise<string>;
    free(): void;
  }

  // Signer interface - matches PrivateKey.d.ts requirements
  export interface Signer {
    sign(owner: string, value: Uint8Array): Promise<string>;
    containsKey(owner: string): Promise<boolean>;
  }
  
  export interface Chain {
    onNotification(handler: (notification: any) => void): void;
    transfer(params: any): Promise<void>;
    balance(): Promise<string>;
    identity(): Promise<any>;
    application(id: string): Promise<Application>;
    free(): void;
  }
  
  export interface ChainNotification {
    reason?: {
      NewBlock?: object;
    };
  }
  
  // Signer utilities namespace
  export namespace signer {
    export class Composite implements Signer {
      constructor(...signers: Signer[]);
      sign(owner: string, value: Uint8Array): Promise<string>;
      containsKey(owner: string): Promise<boolean>;
    }
    
    export class PrivateKey implements Signer {
      constructor(privateKeyHex: string);
      static createRandom(): PrivateKey;
      static fromMnemonic(mnemonic: string): PrivateKey;
      address(): string;
      sign(owner: string, value: Uint8Array): Promise<string>;
      getPublicKey(owner: string): Promise<string>;
      containsKey(owner: string): Promise<boolean>;
    }
  }
}
