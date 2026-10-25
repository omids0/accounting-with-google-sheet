import AppIcon from '../AppIcon'
import { PRIMARY_NAV_ICONS } from './navIcons'
import { SHARED_BOTTOM_NAV_TABS, SHARED_NAV_LINKS } from './sharedTabs'
import TabNavLink from './TabNavLink'
import { BOTTOM_NAV_END_TABS, BOTTOM_NAV_START_TABS, TAB_TITLES, type Tab } from './types'
import { cn } from '../../utils/cn'
import { haptic } from '../../utils/haptics'
import type { AppIconName } from '../appIcon/types'
import {
  bottomNavCenterClass,
  bottomNavClass,
  bottomNavDashboardClass,
  bottomNavDashboardIconClass,
  bottomNavDashboardLabelClass,
  bottomNavSideClass,
  bottomNavTabBtnClass,
  bottomNavTabIconClass,
  bottomNavTabLabelClass
} from '../ui/bottomNavStyles'

interface LayoutBottomNavProps {
  showSettings: boolean
  tab: Tab
  onTabChange: (tab: Tab) => void
  /** The shared account's bar: its four tabs side by side, no raised dashboard button. */
  shared?: boolean
}

/** Links are not `:enabled`, so the shared press feedback is restated for them. */
const bottomNavLinkPressClass = 'active:scale-[0.94] motion-reduce:active:scale-100'

const sharedBottomNavClass = cn(bottomNavClass, 'grid-cols-1')

const SHARED_NAV_ICONS: Partial<Record<Tab, AppIconName>> = Object.fromEntries(
  SHARED_NAV_LINKS.map(link => [link.tab, link.icon])
)

interface BottomNavSideProps {
  tabs: Tab[]
  showSettings: boolean
  tab: Tab
  onTabChange: (tab: Tab) => void
  icons?: Partial<Record<Tab, AppIconName>>
}

function BottomNavSide({
  tabs,
  showSettings,
  tab,
  onTabChange,
  icons = PRIMARY_NAV_ICONS
}: BottomNavSideProps) {
  return (
    <div className={bottomNavSideClass}>
      {tabs.map(navTab => {
        const active = !showSettings && tab === navTab
        const label = TAB_TITLES[navTab]

        return (
          <TabNavLink
            key={navTab}
            tab={navTab}
            active={active}
            className={cn(bottomNavTabBtnClass(active), bottomNavLinkPressClass)}
            aria-label={label}
            onNavigate={() => onTabChange(navTab)}
          >
            <span className={bottomNavTabIconClass(active)}>
              <AppIcon name={icons[navTab] ?? 'dashboard'} />
            </span>
            <span className={bottomNavTabLabelClass}>{label}</span>
          </TabNavLink>
        )
      })}
    </div>
  )
}

export default function LayoutBottomNav({
  showSettings,
  tab,
  onTabChange,
  shared
}: LayoutBottomNavProps) {
  if (shared) {
    return (
      <nav className={sharedBottomNavClass} aria-label="ناوبری اصلی">
        <BottomNavSide
          tabs={SHARED_BOTTOM_NAV_TABS}
          showSettings={showSettings}
          tab={tab}
          onTabChange={onTabChange}
          icons={SHARED_NAV_ICONS}
        />
      </nav>
    )
  }

  const dashboardActive = !showSettings && (tab === 'dashboard' || tab === 'records')

  return (
    <nav className={bottomNavClass} aria-label="ناوبری اصلی">
      <BottomNavSide
        tabs={BOTTOM_NAV_START_TABS}
        showSettings={showSettings}
        tab={tab}
        onTabChange={onTabChange}
      />

      <div className={bottomNavCenterClass}>
        <TabNavLink
          tab="dashboard"
          active={dashboardActive}
          className={cn(bottomNavDashboardClass(dashboardActive), bottomNavLinkPressClass)}
          aria-label={TAB_TITLES.dashboard}
          onNavigate={() => {
            haptic('light')
            onTabChange('dashboard')
          }}
        >
          <span className={bottomNavDashboardIconClass}>
            <AppIcon name="dashboard" />
          </span>
          <span className={bottomNavDashboardLabelClass}>{TAB_TITLES.dashboard}</span>
        </TabNavLink>
      </div>

      <BottomNavSide
        tabs={BOTTOM_NAV_END_TABS}
        showSettings={showSettings}
        tab={tab}
        onTabChange={onTabChange}
      />
    </nav>
  )
}
