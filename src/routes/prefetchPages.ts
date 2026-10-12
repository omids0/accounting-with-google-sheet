import { TAB_PAGE_LOADERS } from './pageChunks'
import type { Tab } from '../components/layout/types'
import { PRIMARY_NAV_TABS } from '../components/layout/types'
import { canPrefetchOnThisConnection } from '../utils/prefetchPolicy'

const prefetchedTabs = new Set<Tab>()

let secondaryPrefetchStarted = false

/** Loads a tab's chunk now; for a tap or navigation that is already happening. */
export function prefetchTabPage(tab: Tab): void {
  if (prefetchedTabs.has(tab)) return

  const loader = TAB_PAGE_LOADERS[tab]

  if (!loader) return

  prefetchedTabs.add(tab)
  void loader()
}

/** Speculative warm-up for a menu item the pointer or thumb is resting on. */
export function prefetchTabPageOnIntent(tab: Tab): void {
  if (canPrefetchOnThisConnection()) prefetchTabPage(tab)
}

export function prefetchBottomNavPages(): void {
  if (!canPrefetchOnThisConnection()) return

  for (const tab of PRIMARY_NAV_TABS) {
    prefetchTabPage(tab)
  }
}

export function prefetchSecondaryAppPages(): void {
  if (secondaryPrefetchStarted || !canPrefetchOnThisConnection()) return
  secondaryPrefetchStarted = true

  const secondaryTabs = (Object.keys(TAB_PAGE_LOADERS) as Tab[]).filter(
    tab => !PRIMARY_NAV_TABS.includes(tab)
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
