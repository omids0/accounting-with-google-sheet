import { useAppUpdateStore } from '../../stores/appUpdateStore'
import { cn } from '../../utils/cn'
import AppIcon from '../AppIcon'
import SyncStatusBadge from '../SyncStatusBadge'
import {
  appHeaderCenterClass,
  appHeaderClass,
  appHeaderTitleClass,
  appHeaderWithBackClass,
  headerBackBtnClass,
  headerGridCenterClass,
  headerGridMenuClass,
  headerIconBtnMenuClass,
  headerIconSpacerClass,
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
    <header className={cn(appHeaderClass, showHeaderBack && appHeaderWithBackClass)}>
      <button
        type="button"
        className={cn(
          headerIconBtnMenuClass(menuOpen),
          mobileOnlyClass,
          headerGridMenuClass,
          'relative'
        )}
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
        {updateAvailable && !menuOpen && <span className={headerMenuDotClass} aria-hidden="true" />}
      </button>
      <div className={cn(appHeaderCenterClass, headerGridCenterClass)} data-header-center>
        <h1 className={appHeaderTitleClass} data-header-title>
          {headerTitle}
        </h1>
        <div className="flex max-w-full flex-wrap items-center gap-1.5">
          {!showSettings && <SyncStatusBadge />}
        </div>
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
