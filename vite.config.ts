/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const basePath = process.env.VITE_BASE_PATH ?? '/'

/** Name prefixes of the hashed chunks only PDF export loads (checked against dist/assets). */
const pdfExportChunks = ['jspdf', 'html2canvas', 'purify.es', 'index.es']
const pdfExportChunkPattern = new RegExp(
  `/assets/(?:${pdfExportChunks.map(name => name.replace('.', '\\.')).join('|')})[^/]*\\.js$`
)

export default defineConfig(({ command }) => ({
  base: basePath,
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts']
  },
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
        type: 'module'
      },
      includeAssets: [
        'favicon.svg',
        'apple-touch-icon.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'pwa-maskable-512x512.png'
      ],
      manifest: {
        id: basePath,
        name: 'حسابداری شخصی',
        short_name: 'حسابداری',
        description: 'نرم‌افزار حسابداری شخصی با ذخیره‌سازی در گوگل شیت',
        theme_color: '#0f766e',
        background_color: '#f0fdfa',
        display: 'standalone',
        orientation: 'portrait',
        lang: 'fa',
        dir: 'rtl',
        start_url: basePath,
        scope: basePath,
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: command === 'serve' ? [] : ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // PDF export only: jspdf, html2canvas and their lazy deps (DOMPurify,
        // canvg as `index.es`). Most sessions never load them, so they are cached
        // on first use (rule below) instead of on install.
        globIgnores: ['**/node_modules/**/*', ...pdfExportChunks.map(name => `**/${name}*.js`)],
        importScripts: ['push-handler.js'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/sheets\.googleapis\.com\/.*/i,
            handler: 'NetworkOnly'
          },
          {
            // Not anchored at the start, so Workbox only matches same-origin URLs.
            urlPattern: pdfExportChunkPattern,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pdf-export-chunks',
              expiration: {
                maxEntries: 12,
                maxAgeSeconds: 60 * 60 * 24 * 90,
                purgeOnQuotaError: true
              }
            }
          }
        ]
      }
    })
  ]
}))
