import LayoutThemeToggle from './LayoutThemeToggle'
import { useWorkspaceType } from '../../hooks/useWorkspaceType'
import { getUserEmail } from '../../services/auth'
import { roleOf } from '../../services/buildingRoles'
import { useDataRevision } from '../../services/dataRevision'
import { registryOf } from '../../services/memberRegistry'
import AppIcon from '../AppIcon'
import { optionLabel } from '../buildings/buildingOptions'
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
  // Inside a building or the shared account the line reads «<sheet> · <role>».
  useDataRevision()
  const workspace = useWorkspaceType()
  const role =
    workspace === 'personal'
      ? null
      : optionLabel(registryOf(workspace).roles, roleOf<string>(getUserEmail() ?? ''))

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
            {role ? `${sheetName} · ${role}` : `شیت: ${sheetName}`}
          </span>
        )}
      </div>
      <LayoutThemeToggle />
    </div>
  )
}
