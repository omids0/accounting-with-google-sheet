import LayoutThemeToggle from './LayoutThemeToggle'
import { useBuildingAccess } from '../../hooks/useBuildingAccess'
import AppIcon from '../AppIcon'
import { optionLabel, BUILDING_ROLES } from '../buildings/buildingOptions'
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
  // Inside a building the line reads «<building> · <role>».
  const { role } = useBuildingAccess()

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
        {sheetName && (
          <span className={appMenuSheetLineClass}>
            {role ? `${sheetName} · ${optionLabel(BUILDING_ROLES, role)}` : `شیت: ${sheetName}`}
          </span>
        )}
      </div>
      <LayoutThemeToggle />
    </div>
  )
}
