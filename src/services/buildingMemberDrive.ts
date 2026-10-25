import { getUserEmail, getUserName } from './auth'
import { addInvite, inviteMessage } from './buildingInvites'
import { can, members } from './buildingRoles'
import { setFileRole, shareFile, unshareFile, type DriveShareRole } from './driveShare'
import type { InviteBlock } from './memberMessages'
import { BUILDING_DRIVE_ROLE, memberRulesOf, registryOf, type MemberRole } from './memberRegistry'
import { refreshSharingInfo } from './sharing'
import type { BuildingRole } from '../components/buildings/buildingOptions'
import { IS_DEV_ENV } from '../utils/appEnv'
import { APP_DOWNLOAD_URL, APP_URL } from '../utils/appLinks'

/**
 * The Drive side of the members of a building or a shared account. Drive goes first and the sheet
 * rows follow, so a refused or offline share leaves no half-invited member; a Drive error reaches
 * the caller. What a role may do in Drive comes from the kind's registry (`memberRegistry.ts`).
 */
export const DRIVE_ROLE: Record<BuildingRole, DriveShareRole> = BUILDING_DRIVE_ROLE

export type { InviteBlock } from './memberMessages'

export { INVITE_BLOCK_MESSAGES } from './memberMessages'

const normalizeEmail = (email: string) => email.trim().toLowerCase()

/** The Drive role of `role` in the sheet's kind; a role the kind does not know only reads. */
function driveRoleOf(spreadsheetId: string, role: MemberRole): DriveShareRole {
  return registryOf(memberRulesOf(spreadsheetId)).driveRole[role] ?? 'reader'
}

/**
 * «+ افزودن»: shares the file with `email` (Drive sends them the invitation e-mail), then writes
 * the member and invite rows. Returns why it refused, or null when the invitation went out.
 * A shared account keeps one partner besides the owner: a second one is refused.
 */
export async function inviteMember(
  spreadsheetId: string,
  email: string,
  role: MemberRole,
  name: string
): Promise<InviteBlock | null> {
  const kind = memberRulesOf(spreadsheetId)

  const registry = registryOf(kind)

  const key = normalizeEmail(email)

  if (!can(registry.settingsPermission, spreadsheetId)) return 'forbidden'
  if (key === normalizeEmail(getUserEmail() ?? '')) return 'self'

  const list = members(spreadsheetId)

  if (list.some(member => member.email === key)) return 'exists'
  if (role === registry.singleRole && list.some(member => member.role === role))
    return 'partner-limit'

  await shareFile(
    spreadsheetId,
    key,
    driveRoleOf(spreadsheetId, role),
    inviteMessage({
      inviterName: getUserName() ?? '',
      buildingName: name,
      role,
      appUrl: APP_URL,
      downloadUrl: APP_DOWNLOAD_URL,
      testBuild: IS_DEV_ENV,
      kind
    })
  )
  await addInvite(spreadsheetId, key, role)
  void refreshSharingInfo(spreadsheetId)

  return null
}

/** The member's new role, in Drive too: a viewer that became a writer must be able to write. */
export async function syncMemberDriveRole(
  spreadsheetId: string,
  email: string,
  role: MemberRole
): Promise<void> {
  await setFileRole(spreadsheetId, email, driveRoleOf(spreadsheetId, role))
  void refreshSharingInfo(spreadsheetId)
}

/** «قطع دسترسی»: the person no longer opens the file in Drive. */
export async function revokeMemberDrive(spreadsheetId: string, email: string): Promise<void> {
  await unshareFile(spreadsheetId, email)
  void refreshSharingInfo(spreadsheetId)
}
