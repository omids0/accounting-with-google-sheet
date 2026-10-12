import AppIcon from '../AppIcon'
import LazyImage from '../LazyImage'
import LayoutMenuGroup from './LayoutMenuGroup'
import LayoutMenuSheetName from './LayoutMenuSheetName'
import LayoutReportsSubmenu from './LayoutReportsSubmenu'
import LayoutSidebarNav from './LayoutSidebarNav'
import LayoutThemeToggle from './LayoutThemeToggle'
import LayoutUpdateItem from './LayoutUpdateItem'
import MenuItemLabel from './MenuItemLabel'
import TabNavLink from './TabNavLink'
import { TAB_TITLES, type Tab } from './types'
import { SETTINGS_PATH } from '../../routes/paths'
import { isBankSmsAvailable } from '../../services/bankSmsNative'
import { cn } from '../../utils/cn'
import type { AppIconName } from '../appIcon/types'
import {
  appMenuAvatarClass,
  appMenuAvatarPlaceholderClass,
  appMenuBackdropClass,
  appMenuDividerClass,
  appMenuDrawerClass,
  appMenuFooterClass,
  appMenuFooterTextClass,
  appMenuGreetingClass,
  appMenuItemClass,
  appMenuItemIconClass,
  appMenuItemLabelClass,
  appMenuItemsClass,
  appMenuNameClass,
  appMenuProfileClass,
  appMenuProfileInnerClass,
  appMenuProfileTextClass,
  appMenuScrollBodyClass
} from '../ui/layoutStyles'

interface LayoutMenuProps {
  menuOpen: boolean
  onCloseMenu: () => void
  userName: string | null
  userPicture: string | null
  tab: Tab
  showSettings: boolean
  isReportTab: boolean
  isCalculationTab: boolean
  isTimesheetTab: boolean
  reportsMenuExpanded: boolean
  onToggleReportsMenu: () => void
  calcMenuExpanded: boolean
  onToggleCalcMenu: () => void
  timesheetMenuExpanded: boolean
  onToggleTimesheetMenu: () => void
  onTabChange: (tab: Tab) => void
  onOpenSettings: () => void
  onOpenTimesheetsList: () => void
}

const CALC_MENU_ITEMS: { tab: Tab; activeTabs: Tab[] }[] = [
  { tab: 'loan-calculator', activeTabs: ['loan-calculator'] },
  { tab: 'currency-converter', activeTabs: ['currency-converter'] },
  { tab: 'date-calculator', activeTabs: ['date-calculator'] },
  { tab: 'dang-split', activeTabs: ['dang-split', 'dang-split-detail'] }
]

interface MenuLinkItemProps {
  tab: Tab
  icon: AppIconName
  active: boolean
  onTabChange: (tab: Tab) => void
}

function MenuLinkItem({ tab, icon, active, onTabChange }: MenuLinkItemProps) {
  return (
    <TabNavLink
      tab={tab}
      active={active}
      className={appMenuItemClass(active)}
      onNavigate={() => onTabChange(tab)}
    >
      <span className={appMenuItemIconClass(active)}>
        <AppIcon name={icon} size={22} />
      </span>
      <MenuItemLabel tab={tab} />
    </TabNavLink>
  )
}

export default function LayoutMenu({
  menuOpen,
  onCloseMenu,
  userName,
  userPicture,
  tab,
  isReportTab,
  isCalculationTab,
  isTimesheetTab,
  reportsMenuExpanded,
  onToggleReportsMenu,
  calcMenuExpanded,
  onToggleCalcMenu,
  timesheetMenuExpanded,
  onToggleTimesheetMenu,
  showSettings,
  onTabChange,
  onOpenSettings,
  onOpenTimesheetsList
}: LayoutMenuProps) {
  const isVisible = menuOpen
  const onPage = (...tabs: Tab[]) => !showSettings && tabs.includes(tab)

  return (
    <>
      {isVisible && (
        <button
          type="button"
          className={appMenuBackdropClass}
          onClick={onCloseMenu}
          aria-label="بستن منو"
        />
      )}
      <nav
        className={cn(appMenuDrawerClass, isVisible ? 'flex' : 'hidden lg:flex')}
        aria-label="منوی اصلی"
      >
        <div className={appMenuProfileClass}>
          <div className={appMenuProfileInnerClass}>
            {userPicture ? (
              <LazyImage src={userPicture} alt="" className={appMenuAvatarClass} />
            ) : (
              <div className={appMenuAvatarPlaceholderClass} aria-hidden>
                <AppIcon name="dashboard" size={28} />
              </div>
            )}
            <div className={appMenuProfileTextClass}>
              {userName && <div className={appMenuNameClass}>{userName}</div>}
              <div className={appMenuGreetingClass}>سلام، خوش آمدید</div>
              <LayoutThemeToggle />
            </div>
          </div>
        </div>

        <div className={appMenuScrollBodyClass}>
          <LayoutSidebarNav tab={tab} showSettings={showSettings} onTabChange={onTabChange} />

          <div className={appMenuItemsClass}>
            <MenuLinkItem
              tab="personal-reminders"
              icon="bell"
              active={onPage('personal-reminders')}
              onTabChange={onTabChange}
            />
            <MenuLinkItem
              tab="vehicle-service"
              icon="car"
              active={onPage('vehicle-service', 'vehicle-detail')}
              onTabChange={onTabChange}
            />
            {isBankSmsAvailable() && (
              <MenuLinkItem
                tab="bank-sms"
                icon="empty-inbox"
                active={onPage('bank-sms')}
                onTabChange={onTabChange}
              />
            )}
            <MenuLinkItem
              tab="counterparties"
              icon="counterparties"
              active={onPage('counterparties')}
              onTabChange={onTabChange}
            />

            <LayoutMenuGroup
              label="گزارشات"
              icon="chart"
              active={isReportTab}
              expanded={reportsMenuExpanded}
              onToggle={onToggleReportsMenu}
            >
              <LayoutReportsSubmenu tab={tab} onTabChange={onTabChange} />
            </LayoutMenuGroup>
            <LayoutMenuGroup
              label="محاسبات"
              icon="calculator"
              active={isCalculationTab}
              expanded={calcMenuExpanded}
              onToggle={onToggleCalcMenu}
              submenu
            >
              {CALC_MENU_ITEMS.map(item => (
                <TabNavLink
                  key={item.tab}
                  tab={item.tab}
                  active={onPage(...item.activeTabs)}
                  className={appMenuItemClass(onPage(...item.activeTabs), 'sub')}
                  onNavigate={() => onTabChange(item.tab)}
                >
                  {TAB_TITLES[item.tab]}
                </TabNavLink>
              ))}
            </LayoutMenuGroup>
            <LayoutMenuGroup
              label="تایم‌شیت"
              icon="clock"
              active={isTimesheetTab}
              expanded={timesheetMenuExpanded}
              onToggle={onToggleTimesheetMenu}
              submenu
            >
              <TabNavLink
                tab="timesheets"
                active={isTimesheetTab}
                className={appMenuItemClass(isTimesheetTab, 'sub')}
                onNavigate={onOpenTimesheetsList}
              >
                لیست تایم‌شیت‌ها
              </TabNavLink>
            </LayoutMenuGroup>
            <div className={appMenuDividerClass} aria-hidden="true" />
            <MenuLinkItem
              tab="about"
              icon="info"
              active={onPage('about')}
              onTabChange={onTabChange}
            />
            <TabNavLink
              to={SETTINGS_PATH}
              active={showSettings}
              className={appMenuItemClass(showSettings)}
              onNavigate={onOpenSettings}
            >
              <span className={appMenuItemIconClass(showSettings)}>
                <AppIcon name="settings" size={22} />
              </span>
              <span className={appMenuItemLabelClass}>تنظیمات</span>
            </TabNavLink>
            <LayoutUpdateItem />
          </div>
        </div>
        <div className={appMenuFooterClass}>
          <p className={appMenuFooterTextClass}>حسابداری شخصی</p>
          <LayoutMenuSheetName />
        </div>
      </nav>
    </>
  )
}
