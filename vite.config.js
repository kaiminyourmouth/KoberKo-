import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      injectRegister: 'auto',
      registerType: 'autoUpdate',
      manifest: {
        name: 'KoberKo',
        short_name: 'KoberKo',
        description: 'Alamin ang tunay mong PhilHealth coverage bago ka ma-overcharge.',
        theme_color: '#1B4FD8',
        background_color: '#F0F4FF',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'icons/icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: 'icons/icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /.*\.(?:js|css|html|ico|png|svg|json|woff2)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'koberko-assets',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  build: {
    // The hospital database is intentionally shipped as a large offline snapshot.
    // We isolate it into its own chunk below, so raise the warning threshold to
    // avoid noisy build output for this expected asset.
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/src/data/hospitals.json')) {
            return 'hospitals-data';
          }

          if (id.includes('node_modules/react')) {
            return 'react-vendor';
          }

          if (id.includes('node_modules')) {
            return 'vendor';
          }

          if (id.includes('/src/services/groq.js')) {
            return 'ai';
          }

          if (id.includes('/src/context/')) {
            return 'context';
          }

          if (id.includes('/src/components/')) {
            return 'components';
          }

          if (id.includes('/src/tabs/')) {
            return 'tabs';
          }

          if (id.includes('/src/data/')) {
            return 'data';
          }
        },
      },
    },
  },
});
