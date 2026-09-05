import { expect, test, type Page } from '@playwright/test'

import { mockGoogleApis, seedMockAppState } from './helpers/mockAppState'

interface NavigationSample {
  from: string
  to: string
  label: string
  clickToPathMs: number
  clickToContentMs: number
  heapUsedMb: number
  longTasksMs: number
}

async function readHeapMb(page: Page): Promise<number> {
  return page.evaluate(() => {
    const perf = performance as Performance & { memory?: { usedJSHeapSize: number } }
    return Math.round((perf.memory?.usedJSHeapSize ?? 0) / 1024 / 1024)
  })
}

async function startLongTaskObserver(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.__navPerf = { longTasksMs: 0 }
    window.__navObserver = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'longtask') {
          window.__navPerf!.longTasksMs += entry.duration
        }
      }
    })
    window.__navObserver.observe({ entryTypes: ['longtask'] })
  })
}

async function stopLongTaskObserver(page: Page): Promise<number> {
  return page.evaluate(() => {
    window.__navObserver?.disconnect()
    return Math.round(window.__navPerf?.longTasksMs ?? 0)
  })
}

async function measureNavigation(
  page: Page,
  from: string,
  to: string,
  label: string,
  expectedPath: string,
  click: () => Promise<void>
): Promise<NavigationSample> {
  await startLongTaskObserver(page)
  const heapBefore = await readHeapMb(page)

  const clickStartedAt = Date.now()
  await click()

  await page.waitForFunction(path => window.location.pathname === path, expectedPath, {
    timeout: 10_000
  })
  const clickToPathMs = Date.now() - clickStartedAt

  await page
    .locator('main')
    .waitFor({ state: 'visible', timeout: 5_000 })
    .catch(() => undefined)

  const clickToContentMs = Date.now() - clickStartedAt
  const longTasksMs = await stopLongTaskObserver(page)

  return {
    from,
    to,
    label: `${from} → ${to}`,
    clickToPathMs,
    clickToContentMs,
    heapUsedMb: Math.max(heapBefore, await readHeapMb(page)),
    longTasksMs
  }
}

async function clickBottomNav(page: Page, label: string): Promise<void> {
  await page.evaluate(() => {
    document.querySelector('[data-rht-toaster]')?.remove()
  })
  await page.locator('nav').getByRole('button', { name: label, exact: true }).click({ force: true })
}

test.describe('navigation performance', () => {
  test.setTimeout(120_000)

  test('measures cold and warm bottom-nav transitions', async ({ page }) => {
    await mockGoogleApis(page)
    await seedMockAppState(page)

    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.locator('nav').waitFor({ state: 'visible', timeout: 30_000 })
    await page.evaluate(() => {
      document.querySelector('[data-rht-toaster]')?.remove()
    })

    const routes = [
      { from: 'dashboard', to: 'installments', label: 'اقساط', path: '/installments' },
      { from: 'installments', to: 'dang', label: 'بدهی', path: '/dang' },
      { from: 'dang', to: 'checks', label: 'چک‌ها', path: '/checks' },
      { from: 'checks', to: 'dashboard', label: 'داشبورد', path: '/' },
      { from: 'dashboard', to: 'receivables', label: 'طلب‌ها', path: '/receivables' },
      { from: 'receivables', to: 'treasury', label: 'صندوق', path: '/treasury' },
      { from: 'treasury', to: 'wallet', label: 'کیف پول', path: '/wallet' },
      { from: 'wallet', to: 'dashboard', label: 'داشبورد', path: '/' }
    ]

    const coldSample = await measureNavigation(
      page,
      'dashboard',
      'installments',
      'اقساط',
      '/installments',
      () => clickBottomNav(page, 'اقساط')
    )

    for (const route of routes.slice(1)) {
      await measureNavigation(page, route.from, route.to, route.label, route.path, () =>
        clickBottomNav(page, route.label)
      )
      await page.waitForTimeout(150)
    }

    const warmSamples: NavigationSample[] = []
    for (const route of routes) {
      const sample = await measureNavigation(
        page,
        route.from,
        route.to,
        route.label,
        route.path,
        () => clickBottomNav(page, route.label)
      )
      warmSamples.push(sample)
      await page.waitForTimeout(150)
    }

    const report = {
      coldFirstVisit: coldSample,
      warm: {
        samples: warmSamples,
        summary: {
          avgPathMs: Math.round(
            warmSamples.reduce((s, i) => s + i.clickToPathMs, 0) / warmSamples.length
          ),
          avgContentMs: Math.round(
            warmSamples.reduce((s, i) => s + i.clickToContentMs, 0) / warmSamples.length
          ),
          maxContentMs: Math.max(...warmSamples.map(i => i.clickToContentMs)),
          maxLongTaskMs: Math.max(...warmSamples.map(i => i.longTasksMs)),
          peakHeapMb: Math.max(...warmSamples.map(i => i.heapUsedMb))
        }
      }
    }

    console.log('\n=== Navigation Performance Report ===')
    console.log(JSON.stringify(report, null, 2))

    expect(report.warm.summary.maxContentMs).toBeLessThan(1_500)
    expect(report.warm.summary.avgPathMs).toBeLessThan(350)
    expect(coldSample.longTasksMs).toBeGreaterThan(0)
  })
})

declare global {
  interface Window {
    __navPerf?: { longTasksMs: number }
    __navObserver?: PerformanceObserver
  }
}
