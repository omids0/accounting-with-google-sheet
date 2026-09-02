import { existsSync, readdirSync } from 'node:fs'
import { homedir, platform } from 'node:os'
import { join } from 'node:path'

/**
 * Playwright CDN is geo-blocked in some regions.
 * Locally we fall back to installed Chrome/Edge — no `playwright install` needed.
 */
export function resolvePlaywrightBrowser() {
  if (process.env.CI) {
    return {}
  }

  if (process.env.PLAYWRIGHT_EXECUTABLE_PATH) {
    return { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
  }

  const channel = process.env.PLAYWRIGHT_CHANNEL ?? detectSystemChannel()

  if (channel) {
    return { channel }
  }

  return {}
}

export function resolveLighthouseChromePath() {
  if (process.env.LHCI_CHROME_PATH && existsSync(process.env.LHCI_CHROME_PATH)) {
    return process.env.LHCI_CHROME_PATH
  }

  const puppeteerChrome = findPuppeteerCacheChrome()

  if (puppeteerChrome) {
    return puppeteerChrome
  }

  return resolveChromePath()
}

export function resolveChromePath() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH
  }

  const chromePath = getChromeCandidates().find(candidate => existsSync(candidate))

  if (chromePath) {
    return chromePath
  }

  return getEdgeCandidates().find(candidate => existsSync(candidate))
}

export function printBrowserHelp() {
  console.log(`
Browser setup (geo-blocked Playwright CDN workaround)
---------------------------------------------------
Local dev uses installed Chrome/Edge automatically.

Optional env vars:
  PLAYWRIGHT_CHANNEL=chrome|msedge
  PLAYWRIGHT_EXECUTABLE_PATH=C:\\path\\to\\chrome.exe
  LHCI_CHROME_PATH=C:\\path\\to\\chrome.exe   (override Lighthouse Chrome)

Lighthouse uses installed Chrome/Edge by default (no Google CDN download needed).
You do NOT need: npx playwright install chromium
`)
}

function findPuppeteerCacheChrome() {
  const cacheRoots = [
    process.env.PUPPETEER_CACHE_DIR,
    join(homedir(), '.cache', 'puppeteer', 'chrome')
  ].filter(Boolean)

  for (const root of cacheRoots) {
    if (!existsSync(root)) {
      continue
    }

    for (const versionDir of readdirSync(root, { withFileTypes: true })) {
      if (!versionDir.isDirectory()) {
        continue
      }

      const candidates = [
        join(root, versionDir.name, 'chrome-win64', 'chrome.exe'),
        join(root, versionDir.name, 'chrome-linux64', 'chrome'),
        join(
          root,
          versionDir.name,
          'chrome-mac-arm64',
          'Google Chrome for Testing.app',
          'Contents',
          'MacOS',
          'Google Chrome for Testing'
        ),
        join(
          root,
          versionDir.name,
          'chrome-mac-x64',
          'Google Chrome for Testing.app',
          'Contents',
          'MacOS',
          'Google Chrome for Testing'
        )
      ]

      const match = candidates.find(candidate => existsSync(candidate))

      if (match) {
        return match
      }
    }
  }

  return undefined
}

function detectSystemChannel() {
  if (getChromeCandidates().some(candidate => existsSync(candidate))) {
    return 'chrome'
  }

  if (getEdgeCandidates().some(candidate => existsSync(candidate))) {
    return 'msedge'
  }

  return undefined
}

function getChromeCandidates() {
  if (platform() === 'win32') {
    return [
      process.env.LOCALAPPDATA
        ? join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe')
        : null,
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    ].filter(Boolean)
  }

  return [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    join(homedir(), 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
  ]
}

function getEdgeCandidates() {
  if (platform() === 'win32') {
    return [
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
    ]
  }

  return []
}
