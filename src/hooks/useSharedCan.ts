import { useWorkspaceType } from './useWorkspaceType'
import { useDataRevision } from '../services/dataRevision'
import type { SharedPermission } from '../services/memberRegistry'
import { sharedCan } from '../services/sharedCan'

/**
 * Whether the signed-in user may do `permission` in the active shared account; always true in a
 * personal sheet or a building. Read again after every sync (roles) and sheet switch.
 */
export function useSharedCan(permission: SharedPermission): boolean {
  useDataRevision()
  useWorkspaceType()

  return sharedCan(permission)
}
