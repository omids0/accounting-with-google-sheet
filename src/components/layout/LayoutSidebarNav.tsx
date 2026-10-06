import AppIcon from '../AppIcon'
import { PRIMARY_NAV_ICONS } from './navIcons'
import TabNavLink from './TabNavLink'
import { PRIMARY_NAV_TABS, TAB_TITLES, type Tab } from './types'
import {
  appMenuDividerClass,
  appMenuItemClass,
  appMenuItemIconClass,
  appMenuItemLabelClass,
  appSidebarNavClass
} from '../ui/layoutStyles'

interface LayoutSidebarNavProps {
  tab: Tab
  showSettings: boolean
  onTabChange: (tab: Tab) => void
}

export default function LayoutSidebarNav({
  tab,
  showSettings,
  onTabChange
}: LayoutSidebarNavProps) {
  const dashboardActive = !showSettings && (tab === 'dashboard' || tab === 'records')

  return (
    <div className={appSidebarNavClass}>
      {PRIMARY_NAV_TABS.map(navTab => {
        const active = navTab === 'dashboard' ? dashboardActive : !showSettings && tab === navTab

        return (
          <TabNavLink
            key={navTab}
            tab={navTab}
            active={active}
            className={appMenuItemClass(active)}
            onNavigate={() => onTabChange(navTab)}
          >
            <span className={appMenuItemIconClass(active)}>
              <AppIcon
                name={PRIMARY_NAV_ICONS[navTab] ?? 'dashboard'}
                size={20}
                strokeWidth={1.75}
              />
            </span>
            <span className={appMenuItemLabelClass}>{TAB_TITLES[navTab]}</span>
          </TabNavLink>
        )
      })}
      <div className={appMenuDividerClass} aria-hidden="true" />
    </div>
  )
}
