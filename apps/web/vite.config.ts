import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // `loadEnv` reads the workspace root first, then the app folder — so a shared
  // `.env` at the monorepo root is picked up by both apps.
  const env = loadEnv(mode, path.resolve(__dirname, '../..'), '');
  const apiPort = env.API_PORT || '3000';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@atlas/shared-types': path.resolve(__dirname, '../../libs/shared-types/src/index.ts'),
        '@atlas/shared-utils': path.resolve(__dirname, '../../libs/shared-utils/src/index.ts'),
      },
    },
    server: {
      port: 5173,
      open: true,
      // Proxy `/api` to the local NestJS instance in dev. In production the
      // FE is served behind the same domain as the API (typically via the
      // NestJS container serving the built bundle), so no proxy is needed.
      proxy: {
        '/api': {
          target: `http://localhost:${apiPort}`,
          changeOrigin: true,
        },
      },
    },
    build: {
      sourcemap: true,
      // Split vendor chunks so initial paint is fast even with recharts/tanstack on board.
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom'],
            charts: ['recharts'],
            map: ['leaflet', 'react-leaflet'],
            query: ['@tanstack/react-query', '@tanstack/react-table'],
            mermaid: ['mermaid'],
          },
        },
      },
    },
  };
});
