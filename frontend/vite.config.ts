import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    // Plugin to handle @linera/client WASM loading
    {
      name: 'linera-wasm',
      configureServer(server) {
        // Serve .wasm files with correct MIME type
        server.middlewares.use((req, res, next) => {
          if (req.url?.endsWith('.wasm')) {
            res.setHeader('Content-Type', 'application/wasm');
          }
          next();
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // COEP/COOP headers for SharedArrayBuffer support (required for Linera WASM)
    headers: {
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3002',
        ws: true,
      },
    },
    // Ensure files from node_modules can be accessed
    fs: {
      allow: ['..'],
    },
  },
  // Don't pre-bundle @linera/client - it needs to load WASM at runtime
  optimizeDeps: {
    exclude: ['@linera/client'],
  },
  // Ensure WASM files are handled correctly
  assetsInclude: ['**/*.wasm'],
  build: {
    // Don't inline WASM files
    assetsInlineLimit: 0,
    rollupOptions: {
      // Preserve original file structure for WASM loading
      output: {
        manualChunks: undefined,
      },
    },
  },
});
