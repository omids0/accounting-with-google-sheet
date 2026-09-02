import {
  printBrowserHelp,
  resolveChromePath,
  resolveLighthouseChromePath,
  resolvePlaywrightBrowser
} from '../tools/quality/resolveBrowser.mjs'

const browser = resolvePlaywrightBrowser()
const chromePath = resolveChromePath()
const lighthouseChrome = resolveLighthouseChromePath()

if (browser.channel) {
  console.log(`✅ Playwright will use channel: ${browser.channel}`)
} else if (browser.executablePath) {
  console.log(`✅ Playwright will use: ${browser.executablePath}`)
} else if (process.env.CI) {
  console.log('✅ CI mode: Playwright will use bundled Chromium from the runner image.')
} else {
  console.error('❌ No local Chrome/Edge found for Playwright.')
  printBrowserHelp()
  process.exit(1)
}

if (lighthouseChrome) {
  console.log(`✅ Lighthouse will use: ${lighthouseChrome}`)
} else if (process.env.CI) {
  console.log('✅ CI mode: Lighthouse will use Chromium from the runner image.')
} else {
  console.error('❌ No Chrome/Edge found for Lighthouse.')
  printBrowserHelp()
  process.exit(1)
}

if (chromePath && chromePath !== lighthouseChrome) {
  console.log(`ℹ️  System browser also available: ${chromePath}`)
}
