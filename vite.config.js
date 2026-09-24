import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'UrbanPulse',
        short_name: 'UrbanPulse',
        description: '320gsm ring-spun cotton, cut in Accra.',
        // These paint the Android install splash, so they follow the
        // Harmattan canvas rather than the palette it replaced. Dark is the
        // right default here: a standalone launch has no OS hint to read.
        theme_color: '#1F1D19',
        background_color: '#1F1D19',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        // Never intercept API routes or sitemap/robots as offline fallback
        navigateFallbackDenylist: [/^\/api\//, /^\/sitemap\.xml/, /^\/robots\.txt/],
        // Precache only the storefront shell. The first visit used to pull all
        // 1.6MB of the build in the background, admin dashboard and charts
        // included, competing with the page itself on slow connections.
        // Everything else is cached the first time it's actually used.
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
        globIgnores: [
          '**/assets/Admin*.js',
          '**/assets/admin*.js',
          '**/assets/charts-*.js',
          '**/assets/Markdown-*.js',
          // Fonts are split by character set so most visitors never fetch
          // latin-ext; precaching would download every file regardless.
          '**/fonts/**',
        ],
        // Never the API: prices, stock and carts must always be live.
        runtimeCaching: [
          {
            // Hashed build files never change under the same name.
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/assets/'),
            handler: 'CacheFirst',
            options: { cacheName: 'up-assets', expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 60 } },
          },
          {
            // Site photos and hero stills: show the cached copy at once and
            // refresh it in the background, since these names aren't hashed.
            urlPattern: ({ url, sameOrigin }) => sameOrigin && /^\/(media|hero|icons)\/.+\.(webp|jpg|png)$/.test(url.pathname),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'up-images', expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
          {
            // Self-hosted fonts (and Fontshare's copy of Clash Display, used
            // only if a build couldn't fetch ours).
            urlPattern: ({ url, sameOrigin }) =>
              (sameOrigin && url.pathname.startsWith('/fonts/')) || url.hostname === 'cdn.fontshare.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'up-font-files',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/sitemap.xml': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/robots.txt': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react:  ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
          charts: ['recharts'],
        },
      },
    },
  },
});
