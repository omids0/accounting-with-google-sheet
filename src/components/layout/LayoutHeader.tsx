import AppIcon from '../AppIcon'
import SyncStatusBadge from '../SyncStatusBadge'

interface LayoutHeaderProps {
  menuOpen: boolean
  onToggleMenu: () => void
  showHeaderBack: boolean
  headerTitle: string
  showSettings: boolean
  onHeaderBack: () => void
}

export default function LayoutHeader({
  menuOpen,
  onToggleMenu,
  showHeaderBack,
  headerTitle,
  showSettings,
  onHeaderBack
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
          onClick={onHeaderBack}
          aria-label="بازگشت"
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
