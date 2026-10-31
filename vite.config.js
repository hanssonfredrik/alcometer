import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registration happens manually in main.jsx so the native (Capacitor)
      // builds can skip the service worker entirely.
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Promilla',
        short_name: 'Promilla',
        description:
          'A private drink journal. Log your drinks, follow an estimate of your evening and build alcohol-free streaks.',
        theme_color: '#0b0912',
        background_color: '#08070c',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        categories: ['health', 'lifestyle'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache the app shell + hashed assets (JS/CSS/fonts) so the app
        // loads and runs fully offline after the first visit.
        globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2}'],
        // The privacy page is served at the canonical /privacy URL by the
        // static host (privacy.html 301s there); keep the PWA out of the way:
        // never precache it and never serve the SPA shell for it.
        globIgnores: ['privacy.html'],
        // robots.txt and sitemap.xml are for crawlers; opening them in a
        // browser should show the file, not the app.
        navigateFallbackDenylist: [
          /^\/privacy/,
          /^\/robots\.txt$/,
          /^\/sitemap\.xml$/,
        ],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },
      devOptions: {
        // Let us exercise the service worker during `npm run dev`.
        enabled: false,
      },
    }),
  ],
  test: {
    // jsdom gives the pure lib tests a `localStorage` + `window` when they
    // exercise the storage adapter; the Widmark/date maths need nothing extra.
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{js,jsx}'],
  },
})
