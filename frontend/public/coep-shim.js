// ============================================================================
// Dynamic Iframe Shim - COEP/COOP Headers for WASM SharedArrayBuffer Support
// ============================================================================
// This script ensures proper Cross-Origin-Embedder-Policy and 
// Cross-Origin-Opener-Policy headers for Linera WASM to work with Dynamic.xyz
//
// Based on: https://github.com/nicolo-ribaudo/worker-browser-shared-modules

(function() {
  // Skip if already in an isolated context or if SharedArrayBuffer is available
  if (typeof SharedArrayBuffer !== 'undefined') {
    console.log('[COEP Shim] SharedArrayBuffer already available');
    return;
  }

  // Check if we can use coi-serviceworker approach
  if (window.crossOriginIsolated === false && 'serviceWorker' in navigator) {
    console.log('[COEP Shim] Registering service worker for cross-origin isolation');
    
    // Create a minimal service worker that adds the headers
    const workerScript = `
      self.addEventListener('install', () => self.skipWaiting());
      self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
      
      self.addEventListener('fetch', (event) => {
        if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') {
          return;
        }
        
        event.respondWith(
          fetch(event.request)
            .then((response) => {
              if (response.status === 0) {
                return response;
              }
              
              const headers = new Headers(response.headers);
              headers.set('Cross-Origin-Embedder-Policy', 'credentialless');
              headers.set('Cross-Origin-Opener-Policy', 'same-origin');
              
              return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers,
              });
            })
            .catch((e) => {
              console.error('[COEP SW] Fetch failed:', e);
              throw e;
            })
        );
      });
    `;

    const blob = new Blob([workerScript], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);

    navigator.serviceWorker.register(workerUrl, { scope: '/' })
      .then((registration) => {
        console.log('[COEP Shim] Service worker registered:', registration.scope);
        
        // If this is the first load, reload to apply headers
        if (!sessionStorage.getItem('coep-shim-reload')) {
          sessionStorage.setItem('coep-shim-reload', 'true');
          console.log('[COEP Shim] Reloading to apply cross-origin isolation...');
          
          // Wait for service worker to be ready
          registration.installing?.addEventListener('statechange', (e) => {
            if (e.target?.state === 'activated') {
              window.location.reload();
            }
          });
          
          // Fallback reload if already active
          if (registration.active) {
            setTimeout(() => window.location.reload(), 100);
          }
        }
      })
      .catch((error) => {
        console.error('[COEP Shim] Service worker registration failed:', error);
      });
  } else if (window.crossOriginIsolated === false) {
    console.warn('[COEP Shim] Cross-origin isolation not available. SharedArrayBuffer will not work.');
    console.warn('[COEP Shim] Ensure your server sends:');
    console.warn('  Cross-Origin-Embedder-Policy: credentialless');
    console.warn('  Cross-Origin-Opener-Policy: same-origin');
  }
})();
