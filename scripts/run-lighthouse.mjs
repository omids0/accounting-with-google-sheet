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

const __dirname = dirname(fileURLToPath(import.meta.url))
const workspaceRoot = join(__dirname, '..')

const APP_NAME = 'personal-accounting-pwa'
const LIGHTHOUSE_PATH = '/'

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

function startStaticServer(distDir, pagePath = '/') {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      try {
        const requestPath = (req.url ?? '/').split('?')[0]
        let filePath = join(distDir, requestPath === '/' ? 'index.html' : requestPath.slice(1))

        if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
          filePath = join(distDir, 'index.html')
        }

        const extension = extname(filePath).toLowerCase()
        const contentType = MIME_TYPES[extension] ?? 'application/octet-stream'
        let body = readFileSync(filePath)
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

      const normalizedPath = pagePath.startsWith('/') ? pagePath : `/${pagePath}`

      resolve({
        server,
        url: `http://127.0.0.1:${address.port}${normalizedPath}`
      })
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

async function runLighthouseAudit({ url, chromePath, chromeProfileDir, lighthouseTempDir }) {
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
        const message = `${categoryId}: ${Math.round(score * 100)}% (min ${Math.round(options.minScore * 100)}%)`
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

  console.log(`\n🔦 Running Lighthouse for ${APP_NAME}...`)
  console.log(`   URL: ${LIGHTHOUSE_PATH}`)
  console.log(`   Dist: ${distDir}`)
  console.log(`   Chrome: ${chromePath}`)
  console.log(`   Temp profile: ${chromeProfileDir}`)

  const { server, url } = await startStaticServer(distDir, LIGHTHOUSE_PATH)

  try {
    const lhr = await runLighthouseAudit({
      url,
      chromePath,
      chromeProfileDir,
      lighthouseTempDir
    })

    writeFileSync(join(outputDir, 'report.json'), JSON.stringify(lhr, null, 2))
    writeFileSync(join(outputDir, 'report.html'), ReportGenerator.generateReportHtml(lhr))

    console.log('   Scores:')
    printScores(lhr)
    console.log(`   Report: ${join(outputDir, 'report.html')}`)

    const { errors, warnings } = evaluateAssertions(lhr)

    for (const warning of warnings) {
      console.warn(`   ⚠️  ${warning}`)
    }

    if (errors.length > 0) {
      console.error(`\n❌ Lighthouse assertions failed:`)
      for (const error of errors) {
        console.error(`   - ${error}`)
      }
      process.exit(1)
    }

    console.log(`✅ Lighthouse passed`)
  } finally {
    server.close()
    cleanupRunTempDir(lighthouseTempDir)
  }
}

await runLighthouse()
