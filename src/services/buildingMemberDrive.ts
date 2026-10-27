import { getUserEmail, getUserName } from './auth'
import { addInvite, addInviteToClosedSheet, inviteMessage } from './buildingInvites'
import { can, memberHasPermission, members } from './buildingRoles'
import { setFileRole, shareFile, unshareFile, type DriveShareRole } from './driveShare'
import { viewerCanWrite } from './memberAccess'
import type { InviteBlock, MemberBlock } from './memberMessages'
import {
  BUILDING_DRIVE_ROLE,
  memberRulesOf,
  registryOf,
  type MemberRole,
  type WorkspaceMember
} from './memberRegistry'
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
 * A shared account keeps one partner besides the owner (a second one is refused) and never gets
 * a second owner. `known` = the members of a sheet that is not the open one (a file created a
 * moment ago): the guards read them and the rows go straight to Sheets, never through the open
 * sheet's mirror.
 */
export async function inviteMember(
  spreadsheetId: string,
  email: string,
  role: MemberRole,
  name: string,
  known?: readonly WorkspaceMember[]
): Promise<InviteBlock | null> {
  const kind = memberRulesOf(spreadsheetId)

  const registry = registryOf(kind)

  const key = normalizeEmail(email)

  const list = known ?? members<WorkspaceMember>(spreadsheetId)

  const allowed = known
    ? memberHasPermission(known, getUserEmail(), registry.settingsPermission, kind)
    : can(registry.settingsPermission, spreadsheetId)

  if (!allowed) return 'forbidden'
  if (registry.ownerFixed && role === registry.ownerRole) return 'owner-fixed'
  if (key === normalizeEmail(getUserEmail() ?? '')) return 'self'
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
  await (known ? addInviteToClosedSheet : addInvite)(spreadsheetId, key, role)
  void refreshSharingInfo(spreadsheetId)

  return null
}

/**
 * «ارسال دوبارهٔ دعوت»: Drive mails the invitation again to a member who has not come in yet.
 * The role and the member rows stay as they are; only the share is repeated.
 */
export async function resendInvite(
  spreadsheetId: string,
  email: string,
  name: string
): Promise<MemberBlock | null> {
  const kind = memberRulesOf(spreadsheetId)

  const key = normalizeEmail(email)

  if (!can(registryOf(kind).settingsPermission, spreadsheetId)) return 'forbidden'

  const member = members<WorkspaceMember>(spreadsheetId).find(item => item.email === key)

  if (!member) return 'unknown'
  // A viewer a writing switch raised keeps «ویرایش» (`setMemberOverrides` raised the share).
  await shareFile(
    spreadsheetId,
    key,
    viewerCanWrite(member, kind) ? 'writer' : driveRoleOf(spreadsheetId, member.role as MemberRole),
    inviteMessage({
      inviterName: getUserName() ?? '',
      buildingName: name,
      role: member.role as MemberRole,
      appUrl: APP_URL,
      downloadUrl: APP_DOWNLOAD_URL,
      testBuild: IS_DEV_ENV,
      kind
    })
  )

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

/**
 * A read-only member given a writing switch (or back to the defaults) moves between Drive
 * «ویرایش» and «فقط مشاهده»; the role itself does not change.
 */
export async function syncMemberDriveWrite(
  spreadsheetId: string,
  email: string,
  write: boolean
): Promise<void> {
  await setFileRole(spreadsheetId, email, write ? 'writer' : 'reader')
  void refreshSharingInfo(spreadsheetId)
}
