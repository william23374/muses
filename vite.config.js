// vite.config.js
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
        suppressWarnings: true,
        suppressErrors: true,
        logLevel: 'silent',
        type: 'module'
      },
      workbox: {
        // Cache strategy configuration
        runtimeCaching: [
          {
            // Match all API requests
            urlPattern: /^\/api\/.*$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 1
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Match all static assets
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|js|css|woff2)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'assets-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7
              }
            }
          },
          {
            // Match navigation requests (HTML)
            urlPattern: /\/$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 // 1 day
              }
            }
          }
        ]
      },
      manifest: {
        name: 'Muses',
        short_name: 'Muses',
        description: '一个高颜值的kugou第三方播放器',
        theme_color: '#335eea',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        display_override: [
          "window-controls-overlay",
          "standalone",
          "minimal-ui",
          "browser"
        ],
        icons: [
          {
            src: '/assets/images/logo.png',
            sizes: '256x256',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  define: {
    __VERSION__: JSON.stringify(process.env.npm_package_version)
  },
  base: '',
  server: {
    host: true,
    port: 8080, // Set dev server port to 8080 for compatibility with other services
  },
  resolve: {
    alias: {
      '@': '/src', // Path alias
    },
  }
});