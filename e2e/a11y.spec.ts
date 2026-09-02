import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.describe('personal-accounting-pwa accessibility', () => {
  test('home page has no critical axe violations', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.locator('.login-page').waitFor({ state: 'visible' })

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    expect(results.violations, formatViolations(results.violations)).toEqual([])
  })
})

function formatViolations(
  violations: Array<{ id: string; impact?: string | null; description: string; nodes: unknown[] }>
): string {
  if (violations.length === 0) {
    return ''
  }

  return violations
    .map(
      violation =>
        `[${violation.impact ?? 'unknown'}] ${violation.id}: ${violation.description} (${
          violation.nodes.length
        } nodes)`
    )
    .join('\n')
}
