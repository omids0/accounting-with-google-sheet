import { createRequire } from 'node:module'
import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { gzipSync } from 'node:zlib'
import { existsSync, mkdirSync, readFileSync, statSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { launch as launchChrome } from 'chrome-launcher'
import lighthouse from 'lighthouse'
import { ReportGenerator } from 'lighthouse/report/generator/report-generator.js'

import { resolveLighthouseChromePath } from '../tools/quality/resolveBrowser.mjs'

const require = createRequire(import.meta.url)
const assertions = require('../tools/lighthouse/assertions.cjs')
// The signed-in state the e2e suite uses (e2e/helpers/mockAppState.ts).
const mockSeed = require('../e2e/helpers/mockAppSeed.json')

const __dirname = dirname(fileURLToPath(import.meta.url))
const workspaceRoot = join(__dirname, '..')

const APP_NAME = 'personal-accounting-pwa'

const SEED_FLAG = 'lighthouse-seed'
const SEED_SCRIPT_PATH = '/__lighthouse/seed.js'

/**
 * Lighthouse drives plain Chrome, so Google's APIs cannot be mocked as in the
 * e2e suite: they (and the other third-party hosts) are blocked instead and the
 * dashboard renders from the seeded local copy, as it does offline.
 */
const SIGNED_IN_BLOCKED_URLS = [
  '*googleapis.com*',
  '*accounts.google.com*',
  '*apis.google.com*',
  '*tgju.org*',
  '*openstreetmap.org*'
]

const AUDIT_PAGES = [
  { name: 'login', path: '/', report: 'report' },
  {
    name: 'dashboard (signed in)',
    path: `/?${SEED_FLAG}`,
    report: 'report-dashboard',
    blockedUrlPatterns: SIGNED_IN_BLOCKED_URLS
  }
]

/** Runs before the app (and before index.html's CSP meta) to write the signed-in state. */
function buildSeedScript() {
  const { spreadsheetId, session, settings, sheets } = mockSeed
  const local = {
    accounting_session: { ...session, tokenExpiry: '__EXPIRY__' },
    accounting_settings: settings,
    [`accounting_sheet_store_${spreadsheetId}`]: { spreadsheetId, sheets, lastSyncedAt: '__NOW__' },
    accounting_onboarding_v1: { [spreadsheetId]: { status: 'finished', steps: {} } }
  }

  return `(function () {
  var now = Date.now()
  var local = ${JSON.stringify(local)}
  Object.keys(local).forEach(function (key) {
    var value = JSON.stringify(local[key])
      .replace('"__EXPIRY__"', String(now + 3600000))
      .replace('"__NOW__"', String(now))
    localStorage.setItem(key, value)
  })
  sessionStorage.setItem('accounting_sheets_ready', ${JSON.stringify(spreadsheetId)})
})()
`
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json'
}

const COMPRESSIBLE_EXTENSIONS = new Set([
  '.html',
  '.js',
  '.css',
  '.json',
  '.svg',
  '.txt',
  '.webmanifest'
])

function prepareTempDirs() {
  const runId = randomUUID()
  const lighthouseTempDir = join(tmpdir(), 'accounting-lighthouse', APP_NAME, runId)
  const chromeProfileDir = join(lighthouseTempDir, 'chrome-profile')

  mkdirSync(chromeProfileDir, { recursive: true })

  return { lighthouseTempDir, chromeProfileDir }
}

function cleanupRunTempDir(lighthouseTempDir) {
  try {
    rmSync(lighthouseTempDir, { recursive: true, force: true, maxRetries: 2, retryDelay: 100 })
  } catch {
    console.warn(`⚠️  Temp profile still locked: ${lighthouseTempDir}`)
    console.warn('   Run later: npm run lighthouse:clean')
  }
}

/** The app page with the seed script ahead of everything, including the CSP meta. */
function readSeededIndex(distDir) {
  const html = readFileSync(join(distDir, 'index.html'), 'utf8')

  return Buffer.from(html.replace('<head>', `<head><script src="${SEED_SCRIPT_PATH}"></script>`))
}

function startStaticServer(distDir) {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      try {
        const [requestPath, query = ''] = (req.url ?? '/').split('?')
        let filePath = join(distDir, requestPath === '/' ? 'index.html' : requestPath.slice(1))
        let body

        if (requestPath === SEED_SCRIPT_PATH) {
          filePath = 'seed.js'
          body = Buffer.from(buildSeedScript())
        } else if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
          filePath = join(distDir, 'index.html')
        }

        if (!body && filePath.endsWith('index.html') && query.split('&').includes(SEED_FLAG)) {
          body = readSeededIndex(distDir)
        }

        const extension = extname(filePath).toLowerCase()
        const contentType = MIME_TYPES[extension] ?? 'application/octet-stream'
        body ??= readFileSync(filePath)
        const headers = { 'Content-Type': contentType }
        const acceptsGzip = (req.headers['accept-encoding'] ?? '').includes('gzip')

        if (COMPRESSIBLE_EXTENSIONS.has(extension) && acceptsGzip && body.length > 1024) {
          body = gzipSync(body)
          headers['Content-Encoding'] = 'gzip'
          headers.Vary = 'Accept-Encoding'
        }

        res.writeHead(200, headers)
        res.end(body)
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
        res.end(`Static server error: ${error.message}`)
      }
    })

    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()

      if (!address || typeof address === 'string') {
        reject(new Error('Failed to start static server'))
        return
      }

      resolve({ server, origin: `http://127.0.0.1:${address.port}` })
    })
  })
}

async function safeKillChrome(chrome) {
  if (!chrome) {
    return
  }

  try {
    await chrome.kill()
  } catch (error) {
    console.warn(`⚠️  Chrome cleanup skipped: ${error.message}`)
  }
}

async function runLighthouseAudit({
  url,
  chromePath,
  chromeProfileDir,
  lighthouseTempDir,
  blockedUrlPatterns = []
}) {
  const chrome = await launchChrome({
    chromePath,
    userDataDir: chromeProfileDir,
    logLevel: 'silent',
    connectionPollInterval: 500,
    maxConnectionRetries: 60,
    envVars: {
      ...process.env,
      TEMP: lighthouseTempDir,
      TMP: lighthouseTempDir,
      TMPDIR: lighthouseTempDir
    },
    chromeFlags: ['--headless=new', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage']
  })

  try {
    await new Promise(resolve => setTimeout(resolve, 500))

    const result = await lighthouse(url, {
      logLevel: 'error',
      output: 'json',
      port: chrome.port,
      hostname: '127.0.0.1',
      blockedUrlPatterns,
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      formFactor: 'desktop',
      screenEmulation: {
        mobile: false,
        width: 1350,
        height: 940,
        deviceScaleFactor: 1,
        disabled: false
      }
    })

    if (!result?.lhr) {
      throw new Error('Lighthouse returned no report data.')
    }

    return result.lhr
  } finally {
    await safeKillChrome(chrome)
  }
}

function evaluateAssertions(lhr) {
  const errors = []
  const warnings = []

  for (const [auditId, rule] of Object.entries(assertions)) {
    const level = Array.isArray(rule) ? rule[0] : rule
    const options = Array.isArray(rule) ? rule[1] : {}

    if (level === 'off') {
      continue
    }

    if (auditId.startsWith('categories:')) {
      const categoryId = auditId.replace('categories:', '')
      const score = lhr.categories[categoryId]?.score

      if (typeof score === 'number' && score < options.minScore) {
        const message = `${categoryId}: ${Math.round(score * 100)}% (min ${Math.round(
          options.minScore * 100
        )}%)`
        ;(level === 'error' ? errors : warnings).push(message)
      }

      continue
    }

    const audit = lhr.audits[auditId]

    if (!audit) {
      continue
    }

    if (typeof options.maxNumericValue === 'number' && typeof audit.numericValue === 'number') {
      if (audit.numericValue > options.maxNumericValue) {
        const message = `${auditId}: ${audit.numericValue} > ${options.maxNumericValue}`
        ;(level === 'error' ? errors : warnings).push(message)
      }
      continue
    }

    if (auditId === 'unused-javascript') {
      const savingsMs = audit.details?.overallSavingsMs

      if (typeof savingsMs === 'number' && savingsMs <= 0) {
        continue
      }
    }

    if (audit.score !== null && audit.score < 1) {
      const message = `${auditId}: ${audit.title}`
      ;(level === 'error' ? errors : warnings).push(message)
    }
  }

  return { errors, warnings }
}

function printScores(lhr) {
  for (const [categoryId, category] of Object.entries(lhr.categories)) {
    console.log(`   ${categoryId}: ${Math.round((category.score ?? 0) * 100)}%`)
  }
}

async function runLighthouse() {
  const distDir = join(workspaceRoot, 'dist')
  const outputDir = join(workspaceRoot, '.lighthouseci')
  const chromePath = resolveLighthouseChromePath()

  if (!existsSync(distDir)) {
    console.error(`❌ Missing build output: ${distDir}`)
    console.error('   Run: npm run build')
    process.exit(1)
  }

  if (!chromePath) {
    console.error('❌ No Chrome/Edge installation found for Lighthouse.')
    process.exit(1)
  }

  const { lighthouseTempDir, chromeProfileDir } = prepareTempDirs()

  mkdirSync(outputDir, { recursive: true })

  console.log(`
🔦 Running Lighthouse for ${APP_NAME}...`)
  console.log(`   Dist: ${distDir}`)
  console.log(`   Chrome: ${chromePath}`)
  console.log(`   Temp profile: ${chromeProfileDir}`)

  const { server, origin } = await startStaticServer(distDir)
  const failures = []

  try {
    for (const page of AUDIT_PAGES) {
      console.log(`
   Page: ${page.name} (${page.path})`)

      const lhr = await runLighthouseAudit({
        url: `${origin}${page.path}`,
        chromePath,
        chromeProfileDir,
        lighthouseTempDir,
        blockedUrlPatterns: page.blockedUrlPatterns
      })

      writeFileSync(join(outputDir, `${page.report}.json`), JSON.stringify(lhr, null, 2))
      writeFileSync(join(outputDir, `${page.report}.html`), ReportGenerator.generateReportHtml(lhr))

      console.log('   Scores:')
      printScores(lhr)
      console.log(`   Report: ${join(outputDir, `${page.report}.html`)}`)

      const { errors, warnings } = evaluateAssertions(lhr)

      for (const warning of warnings) {
        console.warn(`   ⚠️  ${warning}`)
      }

      failures.push(...errors.map(error => `${page.name}: ${error}`))
    }

    if (failures.length > 0) {
      console.error(`
❌ Lighthouse assertions failed:`)
      for (const failure of failures) {
        console.error(`   - ${failure}`)
      }
      process.exitCode = 1

      return
    }

    console.log(`✅ Lighthouse passed`)
  } finally {
    server.close()
    cleanupRunTempDir(lighthouseTempDir)
  }
}

await runLighthouse()
