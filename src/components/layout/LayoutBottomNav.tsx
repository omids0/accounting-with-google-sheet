import AppIcon from '../AppIcon'
import { resolveActiveBarTab } from './bottomNavActive'
import { CHILD_BOTTOM_NAV_TABS, CHILD_NAV_LINKS } from './childTabs'
import { SHARED_BOTTOM_NAV_TABS, SHARED_NAV_LINKS } from './sharedTabs'
import TabNavLink from './TabNavLink'
import { TAB_TITLES, type Tab } from './types'
import { useBottomNavStore } from '../../stores/bottomNavStore'
import { cn } from '../../utils/cn'
import { haptic } from '../../utils/haptics'
import type { AppIconName } from '../appIcon/types'
import { getQuickAction } from '../dashboard/quickActionCatalog'
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
  /** A child's account (parent's read-only view): its three tabs, same shape. */
  child?: boolean
}

/** Links are not `:enabled`, so the shared press feedback is restated for them. */
const bottomNavLinkPressClass = 'active:scale-[0.94] motion-reduce:active:scale-100'

const sharedBottomNavClass = cn(bottomNavClass, 'grid-cols-1')

interface NavItem {
  tab: Tab
  label: string
  icon: AppIconName
}

/** The fixed bars of a shared or child account: the tab list, titled and iconned by their links. */
const itemsOf = (tabs: Tab[], links: { tab: Tab; icon: AppIconName }[]): NavItem[] =>
  tabs.map(navTab => ({
    tab: navTab,
    label: TAB_TITLES[navTab],
    icon: links.find(link => link.tab === navTab)?.icon ?? 'dashboard'
  }))

const SHARED_NAV_ITEMS = itemsOf(SHARED_BOTTOM_NAV_TABS, SHARED_NAV_LINKS)

const CHILD_NAV_ITEMS = itemsOf(CHILD_BOTTOM_NAV_TABS, CHILD_NAV_LINKS)

interface BottomNavSideProps {
  items: NavItem[]
  /** The bar tab that is current, if any (see resolveActiveBarTab). */
  activeTab: Tab | undefined
  onTabChange: (tab: Tab) => void
}

function BottomNavSide({ items, activeTab, onTabChange }: BottomNavSideProps) {
  return (
    <div className={bottomNavSideClass}>
      {items.map(({ tab: navTab, label, icon }) => {
        const active = activeTab === navTab

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
              <AppIcon name={icon} />
            </span>
            <span className={bottomNavTabLabelClass}>{label}</span>
          </TabNavLink>
        )
      })}
    </div>
  )
}

/** The personal bar: the user's six pages (Settings › «نمایش»), three on each side of «داشبورد». */
function usePersonalNavItems(): [NavItem[], NavItem[]] {
  const ids = useBottomNavStore(state => state.ids)
  const items = ids.flatMap(id => {
    const action = getQuickAction(id)

    return action?.tab ? [{ tab: action.tab, label: action.label, icon: action.icon }] : []
  })

  return [items.slice(0, 3), items.slice(3)]
}

export default function LayoutBottomNav({
  showSettings,
  tab,
  onTabChange,
  shared,
  child
}: LayoutBottomNavProps) {
  const [startItems, endItems] = usePersonalNavItems()
  const activeOf = (items: NavItem[]) =>
    showSettings
      ? undefined
      : resolveActiveBarTab(
          items.map(item => item.tab),
          tab
        )

  if (shared || child) {
    const items = child ? CHILD_NAV_ITEMS : SHARED_NAV_ITEMS

    return (
      <nav className={sharedBottomNavClass} aria-label="ناوبری اصلی">
        <BottomNavSide items={items} activeTab={activeOf(items)} onTabChange={onTabChange} />
      </nav>
    )
  }

  // One answer for both sides, so no two bar items are current together.
  const activeTab = activeOf([...startItems, ...endItems])
  // «رکوردها» lights the dashboard button unless the user put it on the bar themselves.
  const recordsOnBar = [...startItems, ...endItems].some(item => item.tab === 'records')
  const dashboardActive =
    !showSettings && (tab === 'dashboard' || (tab === 'records' && !recordsOnBar))

  return (
    <nav className={bottomNavClass} aria-label="ناوبری اصلی">
      <BottomNavSide items={startItems} activeTab={activeTab} onTabChange={onTabChange} />

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

      <BottomNavSide items={endItems} activeTab={activeTab} onTabChange={onTabChange} />
    </nav>
  )
}
