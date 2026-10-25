import type { MenuLinkEntry } from './navMenuGroups'
import type { Tab } from './types'

/** The pages of the shared account («حساب مشترک»): its four bottom-nav tabs. */
export type SharedTab = 'shared-home' | 'shared-records' | 'shared-settle' | 'shared-members'

export const SHARED_TAB_TITLES: Record<SharedTab, string> = {
  'shared-home': 'خانه',
  'shared-records': 'ثبت‌ها',
  'shared-settle': 'تسویه',
  'shared-members': 'اعضا'
}

/**
 * Pages of a shared workspace in prototype order; a personal sheet or a building sends them to
 * its own home. Inside a shared account the personal-only and building pages go to `/shared`.
 */
export const SHARED_TABS: Tab[] = [
  'shared-home',
  'shared-records',
  'shared-settle',
  'shared-members'
]

/** The pages with the «+» (record an expense or income); a viewer's pages register none. */
export const SHARED_SPEED_DIAL_TABS: Tab[] = ['shared-home', 'shared-records']

/**
 * Generic pages a shared account does not use, and where they go instead: the personal entry form
 * and record list (a shared record needs a payer and a split, and edit rights follow its creator)
 * go to the shared pages; the personal-book pages that write their own tabs go home.
 */
export const SHARED_REPLACED_TABS: Partial<Record<Tab, SharedTab>> = {
  entry: 'shared-home',
  records: 'shared-records',
  'opening-balances': 'shared-home',
  'wallet-account-detail': 'shared-home',
  'wallet-reconcile': 'shared-home',
  'net-available-settings': 'shared-home',
  'dang-split': 'shared-home',
  'dang-split-detail': 'shared-home'
}

/** The mobile bottom bar of a shared workspace: all four tabs, no raised centre button. */
export const SHARED_BOTTOM_NAV_TABS: Tab[] = SHARED_TABS

/** The drawer and tablet-rail rows of a shared workspace, under «برگشت به حساب شخصی». */
export const SHARED_NAV_LINKS: MenuLinkEntry[] = [
  { tab: 'shared-home', icon: 'dashboard' },
  { tab: 'shared-records', icon: 'records' },
  { tab: 'shared-settle', icon: 'swap' },
  { tab: 'shared-members', icon: 'counterparties' }
]
