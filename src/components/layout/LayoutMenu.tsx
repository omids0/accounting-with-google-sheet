import LayoutMenuFooter from './LayoutMenuFooter'
import LayoutMenuNav, { type LayoutMenuNavProps } from './LayoutMenuNav'
import LayoutMenuUserRow from './LayoutMenuUserRow'
import { useActiveSpreadsheetName } from '../../hooks/useActiveSpreadsheetName'
import { cn } from '../../utils/cn'
import {
  appMenuBackdropClass,
  appMenuDrawerClass,
  appMenuScrollBodyClass,
  type AppMenuVariant
} from '../ui/layoutStyles'

interface LayoutMenuProps extends LayoutMenuNavProps {
  /** `drawer` overlays the page while open; `sidebar` stays open beside it. */
  variant: AppMenuVariant
  menuOpen: boolean
  onCloseMenu: () => void
  userName: string | null
  userPicture: string | null
}

export default function LayoutMenu({
  variant,
  menuOpen,
  onCloseMenu,
  userName,
  userPicture,
  ...navProps
}: LayoutMenuProps) {
  const sheetName = useActiveSpreadsheetName()
  const isDrawer = variant === 'drawer'
  const isVisible = !isDrawer || menuOpen

  return (
    <>
      {isDrawer && menuOpen && (
        <button
          type="button"
          className={appMenuBackdropClass}
          onClick={onCloseMenu}
          aria-label="بستن منو"
        />
      )}
      <nav
        className={cn(appMenuDrawerClass(variant), !isVisible && 'hidden')}
        aria-label="منوی اصلی"
      >
        <LayoutMenuUserRow
          variant={variant}
          userName={userName}
          userPicture={userPicture}
          sheetName={sheetName}
        />
        <div className={appMenuScrollBodyClass}>
          <LayoutMenuNav {...navProps} />
        </div>
        <LayoutMenuFooter sheetName={sheetName} />
      </nav>
    </>
  )
}
