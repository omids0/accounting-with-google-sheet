import { TAB_PAGE_LOADERS } from './pageChunks'
import type { Tab } from '../components/layout/types'
import { BOTTOM_NAV_TABS } from '../components/layout/types'

const prefetchedTabs = new Set<Tab>()

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
  for (const tab of Object.keys(TAB_PAGE_LOADERS) as Tab[]) {
    if (!BOTTOM_NAV_TABS.includes(tab)) {
      prefetchTabPage(tab)
    }
  }

  void import('./pageChunks').then(chunks => chunks.loadSettingsPage())
}
