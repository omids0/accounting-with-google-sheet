import { rowToActivity } from './activityLog'
import { getUserEmail } from './auth'
import { INVITE_ROW_PREFIX, invitedEmails } from './buildingInvites'
import {
  ACCESS_ROW_PREFIX,
  BUILDING_PERMISSIONS,
  can,
  members,
  ROLE_PERMISSIONS,
  ROLE_ROW_PREFIX,
  type BuildingMember,
  type BuildingPermission,
  type PermissionOverrides
} from './buildingRoles'
import { deletePeriodSettings, setPeriodSetting } from './periodSettings'
import { PERIOD_SETTINGS_SHEET, ACTIVITY_LOG_SHEET } from './sheetNames'
import { getSheetAllRows, getSheetDataRows } from './spreadsheetStore'
import type { BuildingRole } from '../components/buildings/buildingOptions'

/**
 * Member mutations of a building (round 11, Step 9), all rows of «تنظیمات دوره»: the role
 * (`نقش:<email>`), the per-permission overrides (`دسترسی:<email>`) and the invite marker.
 * Every writer re-checks `settings` and the guards, so a stale screen cannot lock the building
 * out of its last manager. This is interface enforcement: the real access is the Drive share.
 */

/** Why a change was refused; null = allowed. */
export type MemberBlock = 'forbidden' | 'unknown' | 'last-manager' | 'self'

export const MEMBER_BLOCK_MESSAGES: Record<MemberBlock, string> = {
  forbidden: 'تغییر اعضا فقط با دسترسی «تنظیمات» ممکن است',
  unknown: 'این عضو پیدا نشد',
  'last-manager': 'ساختمان باید حداقل یک مدیر داشته باشد',
  self: 'نقش و دسترسی خودت را نمی‌توانی تغییر بدهی؛ مدیر دیگری باید این کار را بکند'
}

export const PERMISSION_LABELS: Record<BuildingPermission, string> = {
  record: 'ثبت پرداخت، هزینه، درآمد، چک، پیامک و تسویه',
  issue: 'صدور دستی شارژ',
  autoIssue: 'صدور خودکار شارژ',
  people: 'ویرایش واحدها، ساکنان و طرف حساب‌ها',
  settings: 'تنظیمات، فهرست‌ها، اعضا و جدا کردن ساختمان'
}

/** The permissions that let someone change data: a viewer holding one needs Drive «ویرایش» too. */
const WRITE_PERMISSIONS: BuildingPermission[] = ['record', 'issue', 'people', 'settings']

const normalizeEmail = (email: string) => email.trim().toLowerCase()

export function isCustom(member: BuildingMember): boolean {
  return Object.keys(member.overrides).length > 0
}

export function effectivePermission(member: BuildingMember, permission: BuildingPermission) {
  return member.overrides[permission] ?? ROLE_PERMISSIONS[member.role][permission]
}

/** The overrides after switching `permission`; a value equal to the role's default is dropped. */
export function withOverride(
  member: BuildingMember,
  permission: BuildingPermission,
  value: boolean
): PermissionOverrides {
  const next = { ...member.overrides }

  if (ROLE_PERMISSIONS[member.role][permission] === value) delete next[permission]
  else next[permission] = value

  return next
}

/** A board member (Drive: view only) who was given a permission that writes. */
export function viewerCanWrite(member: BuildingMember): boolean {
  return (
    member.role === 'board' &&
    WRITE_PERMISSIONS.some(permission => effectivePermission(member, permission))
  )
}

export const DRIVE_ACCESS: Record<BuildingRole, string> = {
  manager: 'ویرایش',
  accountant: 'ویرایش',
  board: 'فقط مشاهده'
}

const managerCount = (list: BuildingMember[]) => list.filter(item => item.role === 'manager').length

/** What stops `email` from being changed (role, switches) or removed; null when nothing does. */
export function memberBlock(
  list: BuildingMember[],
  email: string,
  selfEmail: string | null,
  action: 'change' | 'remove',
  nextRole?: BuildingRole
): MemberBlock | null {
  const target = list.find(item => item.email === normalizeEmail(email))

  if (!target) return 'unknown'

  const losesManager =
    target.role === 'manager' && (action === 'remove' || (nextRole && nextRole !== 'manager'))

  if (losesManager && managerCount(list) <= 1) return 'last-manager'

  return normalizeEmail(selfEmail ?? '') === target.email ? 'self' : null
}

function guard(
  spreadsheetId: string,
  email: string,
  action: 'change' | 'remove',
  nextRole?: BuildingRole
): MemberBlock | null {
  if (!can('settings', spreadsheetId)) return 'forbidden'

  return memberBlock(members(spreadsheetId), email, getUserEmail(), action, nextRole)
}

/** A new role replaces the member's own switches: the overrides are cleared. */
export async function changeMemberRole(
  spreadsheetId: string,
  email: string,
  role: BuildingRole
): Promise<MemberBlock | null> {
  const block = guard(spreadsheetId, email, 'change', role)

  if (block) return block

  const key = normalizeEmail(email)

  const member = members(spreadsheetId).find(item => item.email === key)

  if (member?.role === role) return null
  await setPeriodSetting(spreadsheetId, ROLE_ROW_PREFIX + key, role)
  if (member && isCustom(member))
    await setPeriodSetting(spreadsheetId, ACCESS_ROW_PREFIX + key, '{}')

  return null
}

/** Stores the member's overrides (`{}` = back to the defaults of the role). */
export async function setMemberOverrides(
  spreadsheetId: string,
  email: string,
  overrides: PermissionOverrides
): Promise<MemberBlock | null> {
  const block = guard(spreadsheetId, email, 'change')

  if (block) return block

  const clean = Object.fromEntries(
    BUILDING_PERMISSIONS.filter(key => typeof overrides[key] === 'boolean').map(key => [
      key,
      overrides[key]
    ])
  )

  await setPeriodSetting(
    spreadsheetId,
    ACCESS_ROW_PREFIX + normalizeEmail(email),
    JSON.stringify(clean)
  )

  return null
}

/** «قطع دسترسی»: drops the member's rows; the Drive share is the manager's to remove. */
export async function removeMember(
  spreadsheetId: string,
  email: string
): Promise<MemberBlock | null> {
  const block = guard(spreadsheetId, email, 'remove')

  if (block) return block

  const key = normalizeEmail(email)

  await deletePeriodSettings(spreadsheetId, [
    ROLE_ROW_PREFIX + key,
    ACCESS_ROW_PREFIX + key,
    INVITE_ROW_PREFIX + key
  ])

  return null
}

/** «دعوت‌شده»: the invite row is still there and nobody has seen the member yet. */
export type MemberStatus = 'invited' | 'active'

export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  invited: 'دعوت‌شده',
  active: 'فعال'
}

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

/** `memberStatus` for the members of a building, read from the local mirror. */
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

/** «علامت‌گذاری به‌عنوان فعال»: the manager clears a member's invite by hand. */
export async function markMemberActive(
  spreadsheetId: string,
  email: string
): Promise<MemberBlock | null> {
  if (!can('settings', spreadsheetId)) return 'forbidden'
  if (!members(spreadsheetId).some(item => item.email === normalizeEmail(email))) return 'unknown'

  await deletePeriodSettings(spreadsheetId, [INVITE_ROW_PREFIX + normalizeEmail(email)])

  return null
}

const claimTried = new Set<string>()

/**
 * The signed-in user opened the building they were invited to: their own invite row goes, so every
 * device shows them as «فعال». Only roles that edit the Drive sheet try it (a viewer's write would
 * fail and sit in the outbox); a viewer is cleared by the manager («علامت‌گذاری به‌عنوان فعال»).
 * Tried once per session and building, again after a failed attempt. Returns true when removed.
 */
export async function claimOwnInvite(spreadsheetId: string): Promise<boolean> {
  const email = normalizeEmail(getUserEmail() ?? '')

  const mark = `${spreadsheetId}|${email}`

  if (!email || claimTried.has(mark)) return false

  const rows = getSheetDataRows(spreadsheetId, PERIOD_SETTINGS_SHEET) ?? []

  if (!invitedEmails(rows).includes(email)) return false

  const member = members(spreadsheetId).find(item => item.email === email)

  if (!member || DRIVE_ACCESS[member.role] !== 'ویرایش') return false

  claimTried.add(mark)
  try {
    await deletePeriodSettings(spreadsheetId, [INVITE_ROW_PREFIX + email])
  } catch {
    claimTried.delete(mark)

    return false
  }

  return true
}
