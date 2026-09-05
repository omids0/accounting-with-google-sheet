import { TAB_PAGE_LOADERS } from './pageChunks'
import type { Tab } from '../components/layout/types'
import { BOTTOM_NAV_TABS } from '../components/layout/types'

const prefetchedTabs = new Set<Tab>()

let secondaryPrefetchStarted = false

export function prefetchTabPage(tab: Tab): void {
  if (prefetchedTabs.has(tab)) return

  const loader = TAB_PAGE_LOADERS[tab]

  if (!loader) return

  prefetchedTabs.add(tab)
  void loader()
}

export function prefetchBottomNavPages(): void {
  for (const tab of BOTTOM_NAV_TABS) {
    prefetchTabPage(tab)
  }
}

export function prefetchSecondaryAppPages(): void {
  if (secondaryPrefetchStarted) return
  secondaryPrefetchStarted = true

  const secondaryTabs = (Object.keys(TAB_PAGE_LOADERS) as Tab[]).filter(
    tab => !BOTTOM_NAV_TABS.includes(tab)
  )

  const scheduleNext = (index: number) => {
    if (index >= secondaryTabs.length) {
      void import('./pageChunks').then(chunks => chunks.loadSettingsPage())
      return
    }

    prefetchTabPage(secondaryTabs[index])

    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(() => scheduleNext(index + 1), { timeout: 2_000 })
    } else {
      window.setTimeout(() => scheduleNext(index + 1), 120)
    }
  }

  scheduleNext(0)
}
