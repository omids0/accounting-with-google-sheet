/**
 * Keyboard checks axe cannot make (round 5, F6). The file is named `a11y.spec.ts`
 * so the a11y project's `**\/a11y.spec.ts` match runs it with `npm run e2e:a11y`.
 */
import { expect, test, type Page } from '@playwright/test'

import { mockGoogleApis, seedMockAppState } from '../helpers/mockAppState'

/** Presses Tab until `target` has focus; fails after `max` presses. */
async function tabTo(page: Page, target: ReturnType<Page['locator']>, max = 8) {
  for (let press = 0; press < max; press += 1) {
    if (await target.evaluate(element => element === document.activeElement)) return
    await page.keyboard.press('Tab')
  }

  await expect(target).toBeFocused()
}

test.describe('keyboard', () => {
  // A service worker would fetch past the route mocks and hit the real Google API.
  test.use({ serviceWorkers: 'block' })

  test.beforeEach(async ({ page }) => {
    await mockGoogleApis(page)
    await seedMockAppState(page)
  })

  test('entry form: skip link, date by arrows only, save', async ({ page }) => {
    await page.goto('/entry', { waitUntil: 'domcontentloaded' })
    const dateTrigger = page.locator('main button[aria-haspopup="dialog"]').first()
    await expect(dateTrigger).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('main [aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 })

    // The first Tab stop is the skip link; it lands on the page content.
    await page.keyboard.press('Tab')
    const skipLink = page.getByRole('link', { name: 'پرش به محتوا' })
    await expect(skipLink).toBeFocused()
    await expect(skipLink).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(page.locator('main')).toBeFocused()

    await tabTo(page, dateTrigger)
    await page.keyboard.press('Enter')

    const sheet = page.getByRole('dialog', { name: 'انتخاب تاریخ' })
    await expect(sheet).toBeVisible()

    // One Tab stop per wheel: «امروز», then the day wheel.
    const dayWheel = sheet.getByRole('listbox', { name: 'روز' })
    await tabTo(page, dayWheel, 3)

    // ↑↓ change the value, ← moves to the wheel on the left (RTL: day → month).
    await page.keyboard.press('Home')
    await page.keyboard.press('ArrowLeft')
    await expect(sheet.getByRole('listbox', { name: 'ماه' })).toBeFocused()
    await page.keyboard.press('End')
    await expect(sheet.locator('[aria-live="polite"]')).toHaveText(/^۱ اسفند ۱۴[۰-۹]{2}$/)
    const picked = await sheet.locator('[aria-live="polite"]').innerText()

    // Enter confirms and hands focus back to the trigger.
    await page.keyboard.press('Enter')
    await expect(sheet).toBeHidden()
    await expect(dateTrigger).toBeFocused()
    await expect(dateTrigger).toHaveText(picked)

    await page.keyboard.press('Tab')
    await expect(page.getByLabel('مبلغ')).toBeFocused()
    await page.keyboard.type('125000')
    // Typed key by key, the field keeps every digit and adds the thousands separators.
    await expect(page.getByLabel('مبلغ')).toHaveValue('۱۲۵٬۰۰۰')

    const save = page.getByRole('button', { name: 'ذخیره', exact: true })
    await tabTo(page, save, 12)
    await page.keyboard.press('Enter')

    await expect(page.getByText(/ذخیره شد/).first()).toBeVisible()
  })

  test('Escape closes only the date sheet, not the page underneath', async ({ page }) => {
    await page.goto('/entry', { waitUntil: 'domcontentloaded' })

    const dateTrigger = page.locator('main button[aria-haspopup="dialog"]').first()
    await dateTrigger.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog', { name: 'انتخاب تاریخ' })).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page).toHaveURL(/\/entry/)
    await expect(dateTrigger).toBeFocused()
  })
})
