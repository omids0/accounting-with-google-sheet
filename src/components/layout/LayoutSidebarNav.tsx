import { prefetchTabPage } from '../../routes/prefetchPages'
import AppIcon from '../AppIcon'
import { BOTTOM_NAV_TABS, TAB_TITLES, type Tab } from './types'
import {
  appMenuDividerClass,
  appMenuItemClass,
  appMenuItemIconClass,
  appMenuItemLabelClass,
  appSidebarNavClass
} from '../ui/layoutStyles'

const BOTTOM_NAV_ICONS = {
  installments: 'installments',
  dang: 'debt',
  checks: 'checks',
  dashboard: 'dashboard',
  receivables: 'receivables',
  treasury: 'treasury',
  wallet: 'wallet'
} as const

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
      {BOTTOM_NAV_TABS.map(navTab => {
        const active = navTab === 'dashboard' ? dashboardActive : !showSettings && tab === navTab

        return (
          <button
            key={navTab}
            type="button"
            className={appMenuItemClass(active)}
            onPointerDown={() => prefetchTabPage(navTab)}
            onClick={() => onTabChange(navTab)}
            aria-current={active ? 'page' : undefined}
          >
            <span className={appMenuItemIconClass(active)}>
              <AppIcon
                name={BOTTOM_NAV_ICONS[navTab as keyof typeof BOTTOM_NAV_ICONS]}
                size={20}
                strokeWidth={1.75}
              />
            </span>
            <span className={appMenuItemLabelClass}>{TAB_TITLES[navTab]}</span>
          </button>
        )
      })}
      <div className={appMenuDividerClass} aria-hidden="true" />
    </div>
  )
}
