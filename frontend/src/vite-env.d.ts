/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_WS_URL: string;
  readonly VITE_LINERA_APP_ID: string;
  readonly VITE_LINERA_CHAIN_ID: string;
  readonly VITE_LINERA_NODE_URL: string;
  readonly VITE_DYNAMIC_ENVIRONMENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
