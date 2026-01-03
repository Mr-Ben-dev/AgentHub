// ============================================================================
// Chain Init - WASM Initialization Singleton for Linera Client
// ============================================================================

import { initialize } from '@linera/client';

let initPromise: Promise<void> | null = null;
let initialized = false;

/**
 * Ensures Linera WASM is initialized exactly once.
 * Uses a singleton pattern to prevent multiple initializations.
 */
export async function ensureChainInitialized(): Promise<void> {
  if (initialized) {
    return;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      console.log('🔗 Initializing Linera WASM client...');
      // Call the initialize function (named export)
      await initialize();
      initialized = true;
      console.log('✅ Linera WASM client initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Linera WASM:', error);
      initPromise = null;
      throw error;
    }
  })();

  return initPromise;
}

/**
 * Check if WASM is already initialized
 */
export function isChainInitialized(): boolean {
  return initialized;
}

/**
 * Get the Linera client module (must call ensureChainInitialized first)
 */
export async function getLineraClient() {
  await ensureChainInitialized();
  return import('@linera/client');
}
