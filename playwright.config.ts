import { defineConfig, devices } from '@playwright/test'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const { resolvePlaywrightBrowser } = require('./tools/quality/resolveBrowser.mjs')

const localBrowser = resolvePlaywrightBrowser()

const previewPort = 4173

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    trace: 'on-first-retry',
    ...devices['Desktop Chrome'],
    ...(localBrowser.channel ? { channel: localBrowser.channel } : {}),
    ...(localBrowser.executablePath
      ? { launchOptions: { executablePath: localBrowser.executablePath } }
      : {})
  },
  projects: [
    {
      name: 'accounting-pwa-a11y',
      testMatch: '**/a11y.spec.ts',
      use: {
        baseURL: `http://127.0.0.1:${previewPort}`
      }
    }
  ],
  webServer: {
    command: `npm run preview -- --port ${previewPort} --host 127.0.0.1`,
    url: `http://127.0.0.1:${previewPort}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
})
