import AppIcon from '../AppIcon'
import LayoutReportsSubmenu from './LayoutReportsSubmenu'
import type { Tab } from './types'
import {
  appMenuAvatarClass,
  appMenuAvatarPlaceholderClass,
  appMenuBackdropClass,
  appMenuChevronClass,
  appMenuDrawerClass,
  appMenuGreetingClass,
  appMenuGroupClass,
  appMenuItemClass,
  appMenuItemIconClass,
  appMenuItemLabelClass,
  appMenuItemsClass,
  appMenuNameClass,
  appMenuProfileClass,
  appMenuProfileTextClass,
  appMenuSubmenuClass
} from '../ui/layoutStyles'

interface LayoutMenuProps {
  menuOpen: boolean
  onCloseMenu: () => void
  userName: string | null
  userPicture: string | null
  tab: Tab
  isReportTab: boolean
  isCalculationTab: boolean
  isTimesheetTab: boolean
  reportsMenuExpanded: boolean
  onToggleReportsMenu: () => void
  calcMenuExpanded: boolean
  onToggleCalcMenu: () => void
  timesheetMenuExpanded: boolean
  onToggleTimesheetMenu: () => void
  showSettings: boolean
  onTabChange: (tab: Tab) => void
  onOpenSettings: () => void
  onOpenTimesheetsList: () => void
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
  if (!menuOpen) return null

  return (
    <>
      <button
        type="button"
        className={appMenuBackdropClass}
        onClick={onCloseMenu}
        aria-label="بستن منو"
      />
      <nav className={appMenuDrawerClass} aria-label="منوی اصلی">
        <div className={appMenuProfileClass}>
          {userPicture ? (
            <img src={userPicture} alt="" className={appMenuAvatarClass} />
          ) : (
            <div className={appMenuAvatarPlaceholderClass} aria-hidden>
              <AppIcon name="dashboard" size={28} strokeWidth={1.5} />
            </div>
          )}
          <div className={appMenuProfileTextClass}>
            {userName && <div className={appMenuNameClass}>{userName}</div>}
            <div className={appMenuGreetingClass}>سلام، خوش آمدید</div>
          </div>
        </div>
        <div className={appMenuItemsClass}>
          <div className={appMenuGroupClass}>
            <button
              type="button"
              className={appMenuItemClass(isReportTab, 'parent')}
              onClick={onToggleReportsMenu}
              aria-expanded={reportsMenuExpanded}
            >
              <span className={appMenuItemIconClass(isReportTab)}>
                <AppIcon name="chart" size={20} strokeWidth={1.75} />
              </span>
              <span className={appMenuItemLabelClass}>گزارشات</span>
              <span className={appMenuChevronClass(reportsMenuExpanded)} aria-hidden="true">
                <AppIcon name="chevron-down" size={16} strokeWidth={2} />
              </span>
            </button>
            {reportsMenuExpanded && <LayoutReportsSubmenu tab={tab} onTabChange={onTabChange} />}
          </div>
          <div className={appMenuGroupClass}>
            <button
              type="button"
              className={appMenuItemClass(isCalculationTab, 'parent')}
              onClick={onToggleCalcMenu}
              aria-expanded={calcMenuExpanded}
            >
              <span className={appMenuItemIconClass(isCalculationTab)}>
                <AppIcon name="calculator" size={20} strokeWidth={1.75} />
              </span>
              <span className={appMenuItemLabelClass}>محاسبات</span>
              <span className={appMenuChevronClass(calcMenuExpanded)} aria-hidden="true">
                <AppIcon name="chevron-down" size={16} strokeWidth={2} />
              </span>
            </button>
            {calcMenuExpanded && (
              <div className={appMenuSubmenuClass}>
                <button
                  type="button"
                  className={appMenuItemClass(tab === 'loan-calculator', 'sub')}
                  onClick={() => onTabChange('loan-calculator')}
                >
                  محاسبات درخواست وام
                </button>
                <button
                  type="button"
                  className={appMenuItemClass(tab === 'currency-converter', 'sub')}
                  onClick={() => onTabChange('currency-converter')}
                >
                  تبدیل ارز
                </button>
                <button
                  type="button"
                  className={appMenuItemClass(tab === 'date-calculator', 'sub')}
                  onClick={() => onTabChange('date-calculator')}
                >
                  محاسبه تاریخ
                </button>
              </div>
            )}
          </div>
          <div className={appMenuGroupClass}>
            <button
              type="button"
              className={appMenuItemClass(isTimesheetTab, 'parent')}
              onClick={onToggleTimesheetMenu}
              aria-expanded={timesheetMenuExpanded}
            >
              <span className={appMenuItemIconClass(isTimesheetTab)}>
                <AppIcon name="clock" size={20} strokeWidth={1.75} />
              </span>
              <span className={appMenuItemLabelClass}>تایم‌شیت</span>
              <span className={appMenuChevronClass(timesheetMenuExpanded)} aria-hidden="true">
                <AppIcon name="chevron-down" size={16} strokeWidth={2} />
              </span>
            </button>
            {timesheetMenuExpanded && (
              <div className={appMenuSubmenuClass}>
                <button
                  type="button"
                  className={appMenuItemClass(isTimesheetTab, 'sub')}
                  onClick={onOpenTimesheetsList}
                >
                  لیست تایم‌شیت‌ها
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            className={appMenuItemClass(tab === 'about')}
            onClick={() => onTabChange('about')}
          >
            <span className={appMenuItemIconClass(tab === 'about')}>
              <AppIcon name="info" size={20} strokeWidth={1.75} />
            </span>
            درباره
          </button>
          <button type="button" className={appMenuItemClass(showSettings)} onClick={onOpenSettings}>
            <span className={appMenuItemIconClass(showSettings)}>
              <AppIcon name="settings" size={20} strokeWidth={1.75} />
            </span>
            تنظیمات
          </button>
        </div>
      </nav>
    </>
  )
}
