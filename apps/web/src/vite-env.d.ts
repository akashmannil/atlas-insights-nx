/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_USE_DIRECT_FEED?: string;
  readonly VITE_USGS_FEED_URL?: string;
  readonly VITE_QUERY_STALE_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
