import { useAppUpdateStore } from '../../stores/appUpdateStore'
import { cn } from '../../utils/cn'
import AppIcon from '../AppIcon'
import SyncStatusBadge from '../SyncStatusBadge'
import {
  appHeaderCenterClass,
  appHeaderClass,
  appHeaderTitleClass,
  headerGridCenterClass,
  headerGridMenuClass,
  headerBackBtnClass,
  headerIconBtnMenuClass,
  headerMenuDotClass
} from '../ui/layoutStyles'
import { mobileOnlyClass } from '../ui/responsiveStyles'

interface LayoutHeaderProps {
  menuOpen: boolean
  onToggleMenu: () => void
  showHeaderBack: boolean
  headerTitle: string
  showSettings: boolean
  onHeaderBack: () => void
}

/**
 * One header for every page: the title is start-aligned (right in RTL) and the
 * back button, when a page has one, sits on the far end (left in RTL) pointing left.
 */
export default function LayoutHeader({
  menuOpen,
  onToggleMenu,
  showHeaderBack,
  headerTitle,
  showSettings,
  onHeaderBack
}: LayoutHeaderProps) {
  const updateAvailable = useAppUpdateStore(state => !!state.update)

  return (
    <header className={appHeaderClass}>
      <div className={cn(headerGridMenuClass, 'flex items-center gap-1.5')}>
        <button
          type="button"
          className={cn(headerIconBtnMenuClass(menuOpen), mobileOnlyClass, 'relative')}
          onClick={onToggleMenu}
          aria-label={
            menuOpen
              ? 'بستن منو'
              : updateAvailable
              ? 'باز کردن منو — به‌روزرسانی موجود'
              : 'باز کردن منو'
          }
          aria-expanded={menuOpen}
          title="منو"
        >
          <AppIcon name={menuOpen ? 'close' : 'menu'} size={20} strokeWidth={2} />
          {updateAvailable && !menuOpen && (
            <span className={headerMenuDotClass} aria-hidden="true" />
          )}
        </button>
      </div>
      <div className={cn(appHeaderCenterClass, headerGridCenterClass)} data-header-center>
        <h1 className={appHeaderTitleClass} data-header-title>
          {headerTitle}
        </h1>
        {!showSettings && (
          <div className="flex min-w-0 max-w-full items-center">
            <SyncStatusBadge />
          </div>
        )}
      </div>
      {showHeaderBack && (
        <button
          type="button"
          className={headerBackBtnClass}
          onClick={onHeaderBack}
          aria-label="بازگشت"
          title="بازگشت"
        >
          <AppIcon name="back" size={20} strokeWidth={2} />
        </button>
      )}
    </header>
  )
}
