import type { MenuLinkEntry } from './navMenuGroups'
import TabNavLink from './TabNavLink'
import { TAB_TITLES, type Tab } from './types'
import AppIcon from '../AppIcon'
import { appMenuItemClass, appMenuItemIconClass, appMenuItemLabelClass } from '../ui/layoutStyles'

interface LayoutMenuLinkProps {
  entry: MenuLinkEntry
  /** Current tab, or `null` while another destination (settings) is open. */
  currentTab: Tab | null
  onTabChange: (tab: Tab) => void
}

/** Single-line menu row: icon + label. */
export default function LayoutMenuLink({ entry, currentTab, onTabChange }: LayoutMenuLinkProps) {
  const active = currentTab !== null && (entry.activeTabs ?? [entry.tab]).includes(currentTab)

  return (
    <TabNavLink
      tab={entry.tab}
      active={active}
      className={appMenuItemClass(active)}
      onNavigate={() => onTabChange(entry.tab)}
    >
      <span className={appMenuItemIconClass(active)}>
        <AppIcon name={entry.icon} size={20} />
      </span>
      <span className={appMenuItemLabelClass}>{entry.label ?? TAB_TITLES[entry.tab]}</span>
    </TabNavLink>
  )
}
