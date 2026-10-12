/**
 * User-controlled web updates (round 6, F). Named `a11y.spec.ts` so the a11y project's
 * `**\/a11y.spec.ts` match runs it with `npm run e2e:a11y`. A real stale service worker
 * cannot run against the route mocks, so `onNeedRefresh` is stood in for by the test
 * hook `webUpdate.ts` installs only under WebDriver with `__ACCT_E2E__` set.
 */
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { mockGoogleApis, seedMockAppState } from '../helpers/mockAppState'

type HookWindow = Window & {
  __ACCT_E2E__?: boolean
  __loadMarker?: string
  __acctWebUpdate?: { needRefresh: (version: string) => void; applied: number }
}

const banner = (page: Page) => page.locator('[data-update-banner]')

/** Client-side navigation, like a menu tap: no page load. */
async function navigateInApp(page: Page, path: string) {
  await page.evaluate(target => {
    history.pushState({}, '', target)
    dispatchEvent(new PopStateEvent('popstate'))
  }, path)
}

async function announceUpdate(page: Page, version = '9.9.9') {
  await page.evaluate(v => (window as HookWindow).__acctWebUpdate?.needRefresh(v), version)
}

/** A full reload would drop this; it proves nothing reloaded the page. */
async function expectNoReload(page: Page) {
  expect(await page.evaluate(() => (window as HookWindow).__loadMarker)).toBe('first-load')
}

test.describe('web update banner', () => {
  // A service worker would fetch past the route mocks and hit the real Google API.
  test.use({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } })

  test.beforeEach(async ({ page }) => {
    await mockGoogleApis(page)
    await seedMockAppState(page)
    await page.addInitScript(() => {
      ;(window as HookWindow).__ACCT_E2E__ = true
    })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('main')).toBeVisible({ timeout: 15_000 })
    await page.evaluate(() => {
      ;(window as HookWindow).__loadMarker = 'first-load'
    })
  })

  test('waits while a sheet is open, then shows once it closes', async ({ page }) => {
    await navigateInApp(page, '/entry')
    const dateTrigger = page.locator('main button[aria-haspopup="dialog"]').first()
    await dateTrigger.click()
    await expect(page.getByRole('dialog', { name: 'انتخاب تاریخ' })).toBeVisible()

    await announceUpdate(page)
    await page.waitForTimeout(500)
    await expect(banner(page)).toHaveCount(0)
    await expectNoReload(page)

    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(banner(page)).toContainText('نسخه 9.9.9 آماده است')
    await expectNoReload(page)

    // Axe must read the settled colors, not a frame of the slide-in.
    await page.waitForFunction(() =>
      document
        .querySelector('[data-update-banner]')
        ?.getAnimations()
        .every(animation => animation.playState !== 'running')
    )
    const results = await new AxeBuilder({ page })
      .include('[data-update-banner]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(results.violations).toEqual([])
  })

  test('unsaved input holds it back until the next page; «بعداً» lasts the session', async ({
    page
  }) => {
    await navigateInApp(page, '/entry')
    await page.getByLabel('مبلغ').fill('125000')

    await announceUpdate(page)
    await page.waitForTimeout(500)
    await expect(banner(page)).toHaveCount(0)
    // Only the dot on the menu button says an update is ready.
    await expect(
      page.getByRole('button', { name: 'باز کردن منو — به‌روزرسانی موجود' })
    ).toBeVisible()
    await expectNoReload(page)

    await page.goBack()
    await expect(page).toHaveURL(/\/$/)
    await expect(banner(page)).toBeVisible()

    await banner(page).getByRole('button', { name: 'بعداً' }).click()
    await expect(banner(page)).toHaveCount(0)

    await navigateInApp(page, '/wallet')
    await navigateInApp(page, '/')
    await page.waitForTimeout(300)
    await expect(banner(page)).toHaveCount(0)

    await page.getByRole('button', { name: 'باز کردن منو — به‌روزرسانی موجود' }).click()
    const menuItem = page.getByRole('button', { name: 'به‌روزرسانی به 9.9.9' })
    await expect(menuItem).toBeVisible()
    await menuItem.click()
    expect(await page.evaluate(() => (window as HookWindow).__acctWebUpdate?.applied)).toBe(1)
    await expectNoReload(page)
  })
})
