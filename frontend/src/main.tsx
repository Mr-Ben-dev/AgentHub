// ============================================================================
// AgentHub Frontend - Main Entry Point
// ============================================================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core';
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000, // 10 seconds
      refetchOnWindowFocus: true,
    },
  },
});

// Dynamic.xyz configuration
const dynamicEnvId = import.meta.env.VITE_DYNAMIC_ENV_ID || '';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <DynamicContextProvider
        settings={{
          environmentId: dynamicEnvId,
          walletConnectors: [EthereumWalletConnectors],
          appName: 'AgentHub',
          appLogoUrl: '/logo.svg',
        }}
      >
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </DynamicContextProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
