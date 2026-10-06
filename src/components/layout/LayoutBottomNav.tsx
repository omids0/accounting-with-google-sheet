import AppIcon from '../AppIcon'
import { PRIMARY_NAV_ICONS } from './navIcons'
import TabNavLink from './TabNavLink'
import { BOTTOM_NAV_TABS, TAB_TITLES, type Tab } from './types'
import { cn } from '../../utils/cn'
import {
  bottomNavClass,
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

export default function LayoutBottomNav({ showSettings, tab, onTabChange }: LayoutBottomNavProps) {
  return (
    <nav className={cn(bottomNavClass, 'grid-cols-1')} aria-label="ناوبری اصلی">
      <div className={bottomNavSideClass}>
        {BOTTOM_NAV_TABS.map(navTab => {
          const active =
            !showSettings &&
            (navTab === 'dashboard' ? tab === 'dashboard' || tab === 'records' : tab === navTab)
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
    </nav>
  )
}
