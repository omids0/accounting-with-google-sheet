import { can, memberHasPermission } from './buildingRoles'
import type { SharedPermission, SharedRole } from './memberRegistry'
import { workspaceTypeOf, type WorkspaceType } from './workspace'

export const SHARED_NO_ACCESS_MESSAGE = 'دسترسی ندارید'

const SELF = 'self'

/**
 * The role table of a shared account for one person: a member override, else the role default;
 * no role reads as a viewer. Outside a shared account it allows everything, so personal and
 * building screens never ask a shared permission.
 */
export function sharedCanFor(
  kind: WorkspaceType,
  role: SharedRole | null,
  permission: SharedPermission,
  overrides: Partial<Record<SharedPermission, boolean>> = {}
): boolean {
  if (kind !== 'shared') return true

  return memberHasPermission(
    role ? [{ email: SELF, role, overrides }] : [],
    SELF,
    permission,
    'shared'
  )
}

/** Whether the signed-in user may, in `spreadsheetId` (default: the active sheet). */
export function sharedCan(permission: SharedPermission, spreadsheetId?: string): boolean {
  return workspaceTypeOf(spreadsheetId) !== 'shared' || can(permission, spreadsheetId)
}

/** Every shared write path re-checks right before writing, so a stale screen cannot bypass it. */
export function assertSharedCan(permission: SharedPermission, spreadsheetId?: string): void {
  if (!sharedCan(permission, spreadsheetId)) throw new Error(SHARED_NO_ACCESS_MESSAGE)
}
