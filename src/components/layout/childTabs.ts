import type { MenuLinkEntry } from './navMenuGroups'
import type { Tab } from './types'

/**
 * Pages of the parents feature. The first three are the read-only view of a child's account on a
 * parent's device (workspace kind `child`); the last two live in the personal workspace: the
 * parent's list «فرزندان من» and the child's «والدین من».
 */
export type ChildTab =
  | 'child-home'
  | 'child-records'
  | 'child-categories'
  | 'children-home'
  | 'parents-home'

export const CHILD_TAB_TITLES: Record<ChildTab, string> = {
  'child-home': 'خلاصه',
  'child-records': 'تراکنش‌ها',
  'child-categories': 'دسته‌بندی‌ها',
  'children-home': 'فرزندان من',
  'parents-home': 'والدین من'
}

/** The pages of a child's account (kind `child`): the only ones its workspace shows. */
export const CHILD_TABS: Tab[] = ['child-home', 'child-records', 'child-categories']

/** The personal workspace's two entry pages; every other workspace sends them home. */
export const FAMILY_TABS: Tab[] = ['children-home', 'parents-home']

/** The mobile bottom bar and the drawer / rail rows of a child's account, in order. */
export const CHILD_NAV_LINKS: MenuLinkEntry[] = [
  { tab: 'child-home', icon: 'dashboard' },
  { tab: 'child-records', icon: 'records' },
  { tab: 'child-categories', icon: 'chart' }
]

export const CHILD_BOTTOM_NAV_TABS: Tab[] = CHILD_NAV_LINKS.map(link => link.tab)
