import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { mockGoogleApis, seedMockAppState } from './helpers/mockAppState'

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

/** Screens behind sign-in, opened with the mocked Google backend. */
const SIGNED_IN_SCREENS = [
  { name: 'dashboard', path: '/' },
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

test.describe('signed-in screens accessibility', () => {
  // A service worker would fetch past the route mocks and hit the real Google API.
  test.use({ serviceWorkers: 'block' })

  for (const screen of SIGNED_IN_SCREENS) {
    test(`${screen.name} has no axe violations`, async ({ page }) => {
      await mockGoogleApis(page)
      await seedMockAppState(page)
      await page.goto(screen.path, { waitUntil: 'domcontentloaded' })
      await page.locator('main').waitFor({ state: 'visible' })
      await expect(page.locator('main [aria-busy="true"]')).toHaveCount(0)
      await waitForSettledAnimations(page)
      await expectNoViolations(page)
    })
  }

  test('setup wizard has no axe violations', async ({ page }) => {
    await mockGoogleApis(page)
    await seedMockAppState(page)
    await page.addInitScript(() => localStorage.removeItem('accounting_onboarding_v1'))
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'راه‌اندازی اولیه' }).waitFor()
    await waitForSettledAnimations(page)
    await expectNoViolations(page)
  })
})

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
