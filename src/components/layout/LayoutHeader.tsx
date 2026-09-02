import AppIcon from '../AppIcon'
import SyncStatusBadge from '../SyncStatusBadge'
import type { Tab } from './types'

interface LayoutHeaderProps {
  menuOpen: boolean
  onToggleMenu: () => void
  showHeaderBack: boolean
  headerTitle: string
  showSettings: boolean
  tab: Tab
  onTabChange: (tab: Tab) => void
}

export default function LayoutHeader({
  menuOpen,
  onToggleMenu,
  showHeaderBack,
  headerTitle,
  showSettings,
  tab,
  onTabChange
}: LayoutHeaderProps) {
  return (
    <header className={`app-header${showHeaderBack ? ' app-header--with-back' : ''}`}>
      <button
        type="button"
        className={`header-icon-btn header-icon-btn--menu${menuOpen ? ' active' : ''}`}
        onClick={onToggleMenu}
        aria-label={menuOpen ? 'بستن منو' : 'باز کردن منو'}
        aria-expanded={menuOpen}
        title="منو"
      >
        <AppIcon name={menuOpen ? 'close' : 'menu'} size={20} strokeWidth={2} />
      </button>
      <div className="app-header-center">
        <h1 className="app-header-title">{headerTitle}</h1>
        {!showSettings && <SyncStatusBadge />}
      </div>
      {showHeaderBack ? (
        <button
          type="button"
          className="header-icon-btn header-back-btn"
          onClick={() => {
            if (tab === 'timesheet-detail') {
              onTabChange('timesheets')

              return
            }
            onTabChange(tab === 'opening-balances' ? 'wallet' : 'dashboard')
          }}
          aria-label={
            tab === 'timesheet-detail'
              ? 'بازگشت به لیست تایم‌شیت‌ها'
              : tab === 'opening-balances'
              ? 'بازگشت به کیف پول'
              : 'بازگشت به داشبورد'
          }
          title="بازگشت"
        >
          <AppIcon name="back" size={20} strokeWidth={2} />
        </button>
      ) : (
        <span className="header-icon-spacer" aria-hidden="true" />
      )}
    </header>
  )
}
