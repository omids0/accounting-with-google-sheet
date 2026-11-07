import type { ReactNode } from 'react'

import type { MenuLinkEntry } from './navMenuGroups'
import TabNavLink from './TabNavLink'
import { TAB_TITLES, type Tab } from './types'
import AppIcon from '../AppIcon'
import {
  appMenuItemClass,
  appMenuItemIconClass,
  appMenuItemLabelClass,
  appMenuTallItemClass
} from '../ui/layoutStyles'

interface LayoutMenuLinkProps {
  entry: MenuLinkEntry
  /** Current tab, or `null` while another destination (settings) is open. */
  currentTab: Tab | null
  onTabChange: (tab: Tab) => void
  /** A 44px row, for the building switcher. */
  tall?: boolean
  /** After the label (a count, a note): «والدین من» shows who can see the account. */
  trailing?: ReactNode
}

/** Single-line menu row: icon + label. */
export default function LayoutMenuLink({
  entry,
  currentTab,
  onTabChange,
  tall,
  trailing
}: LayoutMenuLinkProps) {
  const active = currentTab !== null && (entry.activeTabs ?? [entry.tab]).includes(currentTab)

  return (
    <TabNavLink
      tab={entry.tab}
      active={active}
      className={tall ? appMenuTallItemClass(active) : appMenuItemClass(active)}
      onNavigate={() => onTabChange(entry.tab)}
    >
      <span className={appMenuItemIconClass(active)}>
        <AppIcon name={entry.icon} size={20} />
      </span>
      <span className={appMenuItemLabelClass}>{entry.label ?? TAB_TITLES[entry.tab]}</span>
      {trailing}
    </TabNavLink>
  )
}
