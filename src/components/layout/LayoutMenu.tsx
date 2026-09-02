import AppIcon from '../AppIcon'
import LayoutReportsSubmenu from './LayoutReportsSubmenu'
import type { Tab } from './types'

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
        className="app-menu-backdrop"
        onClick={onCloseMenu}
        aria-label="بستن منو"
      />
      <nav className="app-menu-drawer" aria-label="منوی اصلی">
        <div className="app-menu-profile">
          {userPicture ? (
            <img src={userPicture} alt="" className="app-menu-avatar" />
          ) : (
            <div className="app-menu-avatar app-menu-avatar--placeholder" aria-hidden>
              <AppIcon name="dashboard" size={28} strokeWidth={1.5} />
            </div>
          )}
          <div className="app-menu-profile-text">
            {userName && <div className="app-menu-name">{userName}</div>}
            <div className="app-menu-greeting">سلام، خوش آمدید</div>
          </div>
        </div>
        <div className="app-menu-items">
          <div className="app-menu-group">
            <button
              type="button"
              className={`app-menu-item app-menu-item--parent${isReportTab ? ' active' : ''}`}
              onClick={onToggleReportsMenu}
              aria-expanded={reportsMenuExpanded}
            >
              <span className="app-menu-item-icon">
                <AppIcon name="chart" size={20} strokeWidth={1.75} />
              </span>
              <span className="app-menu-item-label">گزارشات</span>
              <span
                className={`app-menu-chevron${reportsMenuExpanded ? ' expanded' : ''}`}
                aria-hidden="true"
              >
                <AppIcon name="chevron-down" size={16} strokeWidth={2} />
              </span>
            </button>
            {reportsMenuExpanded && <LayoutReportsSubmenu tab={tab} onTabChange={onTabChange} />}
          </div>
          <div className="app-menu-group">
            <button
              type="button"
              className={`app-menu-item app-menu-item--parent${isCalculationTab ? ' active' : ''}`}
              onClick={onToggleCalcMenu}
              aria-expanded={calcMenuExpanded}
            >
              <span className="app-menu-item-icon">
                <AppIcon name="calculator" size={20} strokeWidth={1.75} />
              </span>
              <span className="app-menu-item-label">محاسبات</span>
              <span
                className={`app-menu-chevron${calcMenuExpanded ? ' expanded' : ''}`}
                aria-hidden="true"
              >
                <AppIcon name="chevron-down" size={16} strokeWidth={2} />
              </span>
            </button>
            {calcMenuExpanded && (
              <div className="app-menu-submenu">
                <button
                  type="button"
                  className={`app-menu-item app-menu-item--sub${
                    tab === 'loan-calculator' ? ' active' : ''
                  }`}
                  onClick={() => onTabChange('loan-calculator')}
                >
                  محاسبات درخواست وام
                </button>
                <button
                  type="button"
                  className={`app-menu-item app-menu-item--sub${
                    tab === 'currency-converter' ? ' active' : ''
                  }`}
                  onClick={() => onTabChange('currency-converter')}
                >
                  تبدیل ارز
                </button>
                <button
                  type="button"
                  className={`app-menu-item app-menu-item--sub${
                    tab === 'date-calculator' ? ' active' : ''
                  }`}
                  onClick={() => onTabChange('date-calculator')}
                >
                  محاسبه تاریخ
                </button>
              </div>
            )}
          </div>
          <div className="app-menu-group">
            <button
              type="button"
              className={`app-menu-item app-menu-item--parent${isTimesheetTab ? ' active' : ''}`}
              onClick={onToggleTimesheetMenu}
              aria-expanded={timesheetMenuExpanded}
            >
              <span className="app-menu-item-icon">
                <AppIcon name="clock" size={20} strokeWidth={1.75} />
              </span>
              <span className="app-menu-item-label">تایم‌شیت</span>
              <span
                className={`app-menu-chevron${timesheetMenuExpanded ? ' expanded' : ''}`}
                aria-hidden="true"
              >
                <AppIcon name="chevron-down" size={16} strokeWidth={2} />
              </span>
            </button>
            {timesheetMenuExpanded && (
              <div className="app-menu-submenu">
                <button
                  type="button"
                  className={`app-menu-item app-menu-item--sub${isTimesheetTab ? ' active' : ''}`}
                  onClick={onOpenTimesheetsList}
                >
                  لیست تایم‌شیت‌ها
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            className={`app-menu-item${showSettings ? ' active' : ''}`}
            onClick={onOpenSettings}
          >
            <span className="app-menu-item-icon">
              <AppIcon name="settings" size={20} strokeWidth={1.75} />
            </span>
            تنظیمات
          </button>
        </div>
      </nav>
    </>
  )
}
