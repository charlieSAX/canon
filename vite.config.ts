import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/canon/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Shell, fonts, icons and ALL content JSON are precached. At 100
        // paintings the images moved to runtime cache-first (the v1 TODO):
        // a day's images are cached when first loaded and served from cache
        // after that, so previously loaded days keep working offline.
        globPatterns: ['**/*.{js,css,html,woff2,png,json,svg}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/canon/img/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'canon-images',
              expiration: { maxEntries: 220, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      },
      manifest: {
        name: 'CANON',
        short_name: 'CANON',
        description: 'Daily art study',
        id: '/canon/',
        start_url: '/canon/',
        scope: '/canon/',
        display: 'standalone',
        background_color: '#0d0d0d',
        theme_color: '#0d0d0d',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ]
})
