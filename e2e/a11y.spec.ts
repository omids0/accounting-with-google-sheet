import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { mockGoogleApis, seedMockAppState } from './helpers/mockAppState'

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

/** Screens behind sign-in, opened with the mocked Google backend. */
const SIGNED_IN_SCREENS = [
  { name: 'dashboard', path: '/' },
  { name: 'charts', path: '/charts' },
  { name: 'entry form', path: '/entry' },
  { name: 'wallet', path: '/wallet' },
  { name: 'checks', path: '/checks' },
  { name: 'settings', path: '/settings' }
]

// Fade-ins must finish so axe reads the settled colors, not a mid-fade frame.
async function waitForSettledAnimations(page: Page) {
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every(
        animation =>
          animation.playState !== 'running' ||
          animation.effect?.getComputedTiming().iterations === Infinity
      )
  )
}

async function expectNoViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()

  expect(results.violations, formatViolations(results.violations)).toEqual([])
}

test.describe('personal-accounting-pwa accessibility', () => {
  test('home page has no critical axe violations', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.locator('.login-page').waitFor({ state: 'visible' })
    await waitForSettledAnimations(page)
    await expectNoViolations(page)
  })
})

/** Switches the seeded settings to the dark theme before the app reads them. */
async function useDarkTheme(page: Page) {
  await page.addInitScript(() => {
    const settings = JSON.parse(localStorage.getItem('accounting_settings') ?? '{}')

    localStorage.setItem('accounting_settings', JSON.stringify({ ...settings, theme: 'dark' }))
  })
}

async function openSignedInScreen(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  await page.locator('main').waitFor({ state: 'visible' })
  // Cold preview builds can keep a list loading past the default 5 s.
  await expect(page.locator('main [aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 })
  await waitForSettledAnimations(page)
}

for (const theme of ['light', 'dark'] as const) {
  const suffix = theme === 'dark' ? ' (dark)' : ''

  test.describe(`signed-in screens accessibility${suffix}`, () => {
    // A service worker would fetch past the route mocks and hit the real Google API.
    test.use({ serviceWorkers: 'block' })

    test.beforeEach(async ({ page }) => {
      await mockGoogleApis(page)
      await seedMockAppState(page)
      if (theme === 'dark') await useDarkTheme(page)
    })

    for (const screen of SIGNED_IN_SCREENS) {
      test(`${screen.name} has no axe violations`, async ({ page }) => {
        await openSignedInScreen(page, screen.path)
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
        await expectNoViolations(page)
      })
    }

    if (theme === 'dark') {
      test('login page has no axe violations', async ({ page }) => {
        // Seeded settings stay dark; without a session the login page shows.
        await page.addInitScript(() => localStorage.removeItem('accounting_session'))
        await page.goto('/', { waitUntil: 'domcontentloaded' })
        await page.locator('.login-page').waitFor({ state: 'visible' })
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
        await waitForSettledAnimations(page)
        await expectNoViolations(page)
      })
    }

    test('setup wizard has no axe violations', async ({ page }) => {
      await page.addInitScript(() => localStorage.removeItem('accounting_onboarding_v1'))
      await page.goto('/', { waitUntil: 'domcontentloaded' })
      await page.getByRole('heading', { name: 'راه‌اندازی اولیه' }).waitFor()
      await waitForSettledAnimations(page)
      await expectNoViolations(page)
    })
  })
}

/** «اندازهٔ متن» (Settings › نمایش) is per device: seeded as its raw localStorage value. */
async function useTextSize(page: Page, size: 'lg' | 'xl') {
  await page.addInitScript(value => localStorage.setItem('accounting_text_size', value), size)
}

const LARGE_TEXT_SCREENS = SIGNED_IN_SCREENS.filter(
  screen => screen.name === 'dashboard' || screen.name === 'entry form'
)

// The page set again at «بزرگ» (112.5 %), and the busiest two at «خیلی بزرگ» (125 %).
const TEXT_SIZE_RUNS = [
  { size: 'lg', label: 'large', screens: SIGNED_IN_SCREENS },
  { size: 'xl', label: 'extra large', screens: LARGE_TEXT_SCREENS }
] as const

for (const run of TEXT_SIZE_RUNS) {
  test.describe(`signed-in screens accessibility (${run.label} text)`, () => {
    test.use({ serviceWorkers: 'block' })

    test.beforeEach(async ({ page }) => {
      await mockGoogleApis(page)
      await seedMockAppState(page)
      await useTextSize(page, run.size)
    })

    for (const screen of run.screens) {
      test(`${screen.name} has no axe violations`, async ({ page }) => {
        await openSignedInScreen(page, screen.path)
        await expect(page.locator('html')).toHaveAttribute('data-text-size', run.size)
        await expectNoViolations(page)
      })
    }
  })
}

function formatViolations(
  violations: Array<{
    id: string
    impact?: string | null
    description: string
    nodes: Array<{ target?: unknown }>
  }>
): string {
  if (violations.length === 0) {
    return ''
  }

  return violations
    .map(
      violation =>
        `[${violation.impact ?? 'unknown'}] ${violation.id}: ${violation.description} (${
          violation.nodes.length
        } nodes: ${violation.nodes
          .slice(0, 3)
          .map(node => JSON.stringify(node.target))
          .join(', ')})`
    )
    .join('\n')
}
