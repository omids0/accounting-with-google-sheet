import { getUserEmail, getUserName } from './auth'
import { addInvite, inviteMessage } from './buildingInvites'
import { can, members } from './buildingRoles'
import { setFileRole, shareFile, unshareFile, type DriveShareRole } from './driveShare'
import { refreshSharingInfo } from './sharing'
import type { BuildingRole } from '../components/buildings/buildingOptions'
import { IS_DEV_ENV } from '../utils/appEnv'
import { APP_DOWNLOAD_URL, APP_URL } from '../utils/appLinks'

/**
 * The Drive side of the members of a building. Drive goes first and the sheet rows follow, so a
 * refused or offline share leaves no half-invited member; a Drive error reaches the caller.
 * The single source of what a role may do in Drive: «ویرایش» for the ones who write.
 */
export const DRIVE_ROLE: Record<BuildingRole, DriveShareRole> = {
  manager: 'writer',
  accountant: 'writer',
  board: 'reader'
}

/** Why an invitation was refused before anything was sent. */
export type InviteBlock = 'forbidden' | 'self' | 'exists'

export const INVITE_BLOCK_MESSAGES: Record<InviteBlock, string> = {
  forbidden: 'دعوت عضو فقط با دسترسی «تنظیمات» ممکن است',
  self: 'این ایمیل خود شماست و از قبل عضو ساختمان هستید',
  exists: 'این ایمیل از قبل عضو ساختمان است؛ نقشش را از صفحهٔ «اعضا و دسترسی‌ها» عوض کنید'
}

const normalizeEmail = (email: string) => email.trim().toLowerCase()

/**
 * «+ افزودن»: shares the building file with `email` (Drive sends them the invitation e-mail), then
 * writes the member and invite rows. Returns why it refused, or null when the invitation went out.
 */
export async function inviteMember(
  spreadsheetId: string,
  email: string,
  role: BuildingRole,
  buildingName: string
): Promise<InviteBlock | null> {
  const key = normalizeEmail(email)

  if (!can('settings', spreadsheetId)) return 'forbidden'
  if (key === normalizeEmail(getUserEmail() ?? '')) return 'self'
  if (members(spreadsheetId).some(member => member.email === key)) return 'exists'

  await shareFile(
    spreadsheetId,
    key,
    DRIVE_ROLE[role],
    inviteMessage({
      inviterName: getUserName() ?? '',
      buildingName,
      role,
      appUrl: APP_URL,
      downloadUrl: APP_DOWNLOAD_URL,
      testBuild: IS_DEV_ENV
    })
  )
  await addInvite(spreadsheetId, key, role)
  void refreshSharingInfo(spreadsheetId)

  return null
}

/** The member's new role, in Drive too: a viewer that became an accountant must be able to write. */
export async function syncMemberDriveRole(
  spreadsheetId: string,
  email: string,
  role: BuildingRole
): Promise<void> {
  await setFileRole(spreadsheetId, email, DRIVE_ROLE[role])
  void refreshSharingInfo(spreadsheetId)
}

/** «قطع دسترسی»: the person no longer opens the building file in Drive. */
export async function revokeMemberDrive(spreadsheetId: string, email: string): Promise<void> {
  await unshareFile(spreadsheetId, email)
  void refreshSharingInfo(spreadsheetId)
}
