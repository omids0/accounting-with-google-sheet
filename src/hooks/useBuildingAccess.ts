import type { BuildingRole } from '../components/buildings/buildingOptions'
import { getUserEmail } from '../services/auth'
import { can, roleOf, type BuildingPermission } from '../services/buildingRoles'
import { useDataRevision } from '../services/dataRevision'
import { getActiveWorkspaceType } from '../services/workspace'

/**
 * Who the signed-in user is in the active building: their role and a `can()` bound to it.
 * Roles are rows of the mirrored «تنظیمات دوره», so the answer is read again after every sync.
 */
export function useBuildingAccess(): {
  role: BuildingRole | null
  can: (permission: BuildingPermission) => boolean
} {
  useDataRevision()

  return {
    role: getActiveWorkspaceType() === 'building' ? roleOf(getUserEmail() ?? '') : null,
    can
  }
}
