import { cn } from '../../utils/cn'
import AppIcon from '../AppIcon'
import SyncStatusBadge from '../SyncStatusBadge'
import {
  appHeaderCenterClass,
  appHeaderClass,
  appHeaderTitleClass,
  appHeaderWithBackClass,
  headerBackBtnClass,
  headerIconBtnMenuClass,
  headerIconSpacerClass
} from '../ui/layoutStyles'

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
    <header className={cn(appHeaderClass, showHeaderBack && appHeaderWithBackClass)}>
      <button
        type="button"
        className={headerIconBtnMenuClass(menuOpen)}
        onClick={onToggleMenu}
        aria-label={menuOpen ? 'بستن منو' : 'باز کردن منو'}
        aria-expanded={menuOpen}
        title="منو"
      >
        <AppIcon name={menuOpen ? 'close' : 'menu'} size={20} strokeWidth={2} />
      </button>
      <div className={appHeaderCenterClass} data-header-center>
        <h1 className={appHeaderTitleClass} data-header-title>
          {headerTitle}
        </h1>
        {!showSettings && <SyncStatusBadge />}
      </div>
      {showHeaderBack ? (
        <button
          type="button"
          className={headerBackBtnClass}
          onClick={onHeaderBack}
          aria-label="بازگشت"
          title="بازگشت"
        >
          <AppIcon name="back" size={20} strokeWidth={2} />
        </button>
      ) : (
        <span className={headerIconSpacerClass} aria-hidden="true" />
      )}
    </header>
  )
}
