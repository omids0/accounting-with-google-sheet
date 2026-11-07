import { WALLET_SUB_TABS, VEHICLE_TABS } from './tabGroups'
import type { Tab } from './types'

/** Pages under a bar tab that keep it lit (the drawer lights the same entries). */
const SUB_PAGES: Partial<Record<Tab, Tab[]>> = {
  wallet: WALLET_SUB_TABS,
  'vehicle-service': VEHICLE_TABS
}

/**
 * The one bar tab that is current for `tab`: the exact page first, then the tab whose sub-pages
 * hold it. One answer, so two bar items never carry `aria-current` together («انتقال» and
 * «کیف پول» both on the bar while the transfers page is open).
 */
export function resolveActiveBarTab(barTabs: Tab[], tab: Tab): Tab | undefined {
  return (
    barTabs.find(barTab => barTab === tab) ??
    barTabs.find(barTab => SUB_PAGES[barTab]?.includes(tab))
  )
}
