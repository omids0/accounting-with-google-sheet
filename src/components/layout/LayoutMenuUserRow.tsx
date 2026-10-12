import LayoutThemeToggle from './LayoutThemeToggle'
import AppIcon from '../AppIcon'
import LazyImage from '../LazyImage'
import {
  appMenuAvatarClass,
  appMenuAvatarPlaceholderClass,
  appMenuNameClass,
  appMenuSheetLineClass,
  appMenuUserRowClass,
  appMenuUserTextClass,
  type AppMenuVariant
} from '../ui/layoutStyles'

interface LayoutMenuUserRowProps {
  variant: AppMenuVariant
  userName: string | null
  userPicture: string | null
  sheetName: string
}

/** Top of the menu: who is signed in, which sheet is open, and the theme switch. */
export default function LayoutMenuUserRow({
  variant,
  userName,
  userPicture,
  sheetName
}: LayoutMenuUserRowProps) {
  return (
    <div className={appMenuUserRowClass(variant)}>
      {userPicture ? (
        <LazyImage src={userPicture} alt="" className={appMenuAvatarClass} />
      ) : (
        <span className={appMenuAvatarPlaceholderClass} aria-hidden="true">
          {userName?.trim().charAt(0) || <AppIcon name="dashboard" size={18} />}
        </span>
      )}
      <div className={appMenuUserTextClass}>
        {userName && <span className={appMenuNameClass}>{userName}</span>}
        {sheetName && <span className={appMenuSheetLineClass}>شیت: {sheetName}</span>}
      </div>
      <LayoutThemeToggle />
    </div>
  )
}
