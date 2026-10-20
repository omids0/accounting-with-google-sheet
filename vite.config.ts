/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const basePath = process.env.VITE_BASE_PATH ?? '/'

/** Develop builds (`VITE_APP_ENV=dev`) say «dev» in the installed app's name. */
const appName = process.env.VITE_APP_ENV === 'dev' ? 'حساب کتاب (dev)' : 'حساب کتاب'

/** The app reads the same field (`import { version } from 'package.json'`). */
const appVersion = (JSON.parse(readFileSync('./package.json', 'utf8')) as { version: string })
  .version

/**
 * `version.json` beside the build: the update banner fetches it to name the waiting
 * service worker's version, and it is precached with the version as its revision.
 */
const versionFile: Plugin = {
  name: 'app-version-file',
  apply: 'build',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'version.json',
      source: JSON.stringify({ version: appVersion })
    })
  }
}

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
    versionFile,
    VitePWA({
      // A new version waits for the user's «به‌روزرسانی» (src/services/webUpdate.ts).
      registerType: 'prompt',
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
        name: appName,
        short_name: appName,
        description: 'حساب کتاب: حسابداری شخصی با ذخیره‌سازی در گوگل شیت',
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
        ],
        // Long-press on the home-screen icon; App reads `?action=` (useLaunchAction).
        shortcuts: [
          {
            name: 'ثبت هزینه',
            url: `${basePath}?action=expense`,
            icons: [{ src: 'shortcut-expense.png', sizes: '96x96', type: 'image/png' }]
          },
          {
            name: 'ثبت درآمد',
            url: `${basePath}?action=income`,
            icons: [{ src: 'shortcut-income.png', sizes: '96x96', type: 'image/png' }]
          },
          {
            name: 'پیامک‌های بانکی',
            url: `${basePath}?action=sms`,
            icons: [{ src: 'shortcut-sms.png', sizes: '96x96', type: 'image/png' }]
          }
        ],
        // A bank SMS shared from the messages app runs through the bank SMS parser.
        share_target: {
          action: `${basePath}?share=1`,
          method: 'GET',
          params: { text: 'text' }
        }
      },
      workbox: {
        globPatterns: command === 'serve' ? [] : ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // PDF export only: jspdf, html2canvas and their lazy deps (DOMPurify,
        // canvg as `index.es`). Most sessions never load them, so they are cached
        // on first use (rule below) instead of on install.
        globIgnores: ['**/node_modules/**/*', ...pdfExportChunks.map(name => `**/${name}*.js`)],
        additionalManifestEntries:
          command === 'serve' ? [] : [{ url: 'version.json', revision: appVersion }],
        importScripts: ['push-handler.js'],
        // The develop build is served under `<base>dev/`, inside this worker's scope. Its
        // pages must come from the network, not from this build's index.html.
        navigateFallbackDenylist: [new RegExp(`^${basePath}dev/`)],
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
