import AppIcon from '../AppIcon'
import { PRIMARY_NAV_ICONS } from './navIcons'
import TabNavLink from './TabNavLink'
import { BOTTOM_NAV_END_TABS, BOTTOM_NAV_START_TABS, TAB_TITLES, type Tab } from './types'
import { cn } from '../../utils/cn'
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
}

/** Links are not `:enabled`, so the shared press feedback is restated for them. */
const bottomNavLinkPressClass = 'active:scale-[0.94] motion-reduce:active:scale-100'

interface BottomNavSideProps {
  tabs: Tab[]
  showSettings: boolean
  tab: Tab
  onTabChange: (tab: Tab) => void
}

function BottomNavSide({ tabs, showSettings, tab, onTabChange }: BottomNavSideProps) {
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
              <AppIcon name={PRIMARY_NAV_ICONS[navTab] ?? 'dashboard'} />
            </span>
            <span className={bottomNavTabLabelClass}>{label}</span>
          </TabNavLink>
        )
      })}
    </div>
  )
}

export default function LayoutBottomNav({ showSettings, tab, onTabChange }: LayoutBottomNavProps) {
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
          onNavigate={() => onTabChange('dashboard')}
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
