import { rowToActivity } from './activityLog'
import { getUserEmail } from './auth'
import { INVITE_ROW_PREFIX, invitedEmails } from './buildingInvites'
import { can, members } from './buildingRoles'
import { deleteMemberSettings } from './buildingSettings'
import type { MemberBlock } from './memberMessages'
import { memberRulesOf, registryOf } from './memberRegistry'
import { ACTIVITY_LOG_SHEET, PERIOD_SETTINGS_SHEET } from './sheetNames'
import { getSheetAllRows, getSheetDataRows } from './spreadsheetStore'

/**
 * «دعوت‌شده / فعال» of the members of a building or a shared account: the invite row
 * (`دعوت:<email>`) stays until the member is seen (an activity-log entry, their own claim, or the
 * manager's «علامت‌گذاری به‌عنوان فعال»).
 */
export type MemberStatus = 'invited' | 'active'

export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  invited: 'دعوت‌شده',
  active: 'فعال'
}

const normalizeEmail = (email: string) => email.trim().toLowerCase()

/** E-mails with at least one entry in the activity log («کاربر» column): they have written here. */
export function activityWriters(rows: readonly (readonly unknown[])[]): Set<string> {
  return new Set(
    rows
      .slice(1)
      .map(row => rowToActivity(row)?.email ?? '')
      .filter(Boolean)
  )
}

/**
 * A member is «دعوت‌شده» while their invite row is left and nothing shows they joined: they are not
 * the signed-in user, and the activity log has no entry written by their e-mail. Everyone else is
 * «فعال» (also a member who was never invited by the app, or whose invite was cleared).
 */
export function memberStatus(
  email: string,
  input: { invited: ReadonlySet<string>; me: string; writers: ReadonlySet<string> }
): MemberStatus {
  const key = normalizeEmail(email)

  return input.invited.has(key) && key !== normalizeEmail(input.me) && !input.writers.has(key)
    ? 'invited'
    : 'active'
}

/** `memberStatus` for the members of a sheet, read from the local mirror. */
export function memberStatusReader(
  spreadsheetId: string,
  me: string | null = getUserEmail()
): (email: string) => MemberStatus {
  const invited = new Set(
    invitedEmails(getSheetDataRows(spreadsheetId, PERIOD_SETTINGS_SHEET) ?? [])
  )

  const writers = invited.size
    ? activityWriters(getSheetAllRows(spreadsheetId, ACTIVITY_LOG_SHEET) ?? [])
    : new Set<string>()

  return email => memberStatus(email, { invited, me: me ?? '', writers })
}

/** «علامت‌گذاری به‌عنوان فعال»: the member manager clears a member's invite by hand. */
export async function markMemberActive(
  spreadsheetId: string,
  email: string
): Promise<MemberBlock | null> {
  const { settingsPermission } = registryOf(memberRulesOf(spreadsheetId))

  if (!can(settingsPermission, spreadsheetId)) return 'forbidden'
  if (!members(spreadsheetId).some(item => item.email === normalizeEmail(email))) return 'unknown'

  await deleteMemberSettings(spreadsheetId, [INVITE_ROW_PREFIX + normalizeEmail(email)])

  return null
}

const claimTried = new Set<string>()

/**
 * The signed-in user opened the sheet they were invited to: their own invite row goes, so every
 * device shows them as «فعال». Only roles that edit the Drive sheet try it (a viewer's write would
 * fail and sit in the outbox); a viewer is cleared by the manager («علامت‌گذاری به‌عنوان فعال»).
 * Tried once per session and sheet, again after a failed attempt. Returns true when removed.
 */
export async function claimOwnInvite(spreadsheetId: string): Promise<boolean> {
  const email = normalizeEmail(getUserEmail() ?? '')

  const mark = `${spreadsheetId}|${email}`

  if (!email || claimTried.has(mark)) return false

  const rows = getSheetDataRows(spreadsheetId, PERIOD_SETTINGS_SHEET) ?? []

  if (!invitedEmails(rows).includes(email)) return false

  const member = members(spreadsheetId).find(item => item.email === email)

  const { driveRole } = registryOf(memberRulesOf(spreadsheetId))

  if (!member || driveRole[member.role] !== 'writer') return false

  claimTried.add(mark)
  try {
    await deleteMemberSettings(spreadsheetId, [INVITE_ROW_PREFIX + email])
  } catch {
    claimTried.delete(mark)

    return false
  }

  return true
}
