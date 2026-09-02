const { join } = require('node:path')

const staticDistDir = process.env.LHCI_STATIC_DIST_DIR ?? './dist'
const workspaceRoot = join(__dirname, '..', '..')
const chromeProfileDir = join(workspaceRoot, '.lighthouseci', 'profile-accounting')
const assertions = require('./assertions.cjs')

const chromePath = process.env.LHCI_CHROME_PATH || process.env.CHROME_PATH

/** @type {import('@lhci/cli/src/index').LHCI.ServerCommand.Options} */
module.exports = {
  ci: {
    collect: {
      staticDistDir,
      numberOfRuns: process.env.CI ? 3 : 1,
      ...(chromePath ? { chromePath } : {}),
      settings: {
        preset: 'desktop',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        chromeFlags: [
          '--headless=old',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-default-browser-check',
          `--user-data-dir=${chromeProfileDir}`
        ]
      }
    },
    assert: {
      assertions
    },
    upload: {
      target: 'filesystem',
      outputDir: './.lighthouseci/accounting'
    }
  }
}
