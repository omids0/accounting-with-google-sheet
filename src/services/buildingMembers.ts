import { getUserEmail } from './auth'
import { INVITE_ROW_PREFIX } from './buildingInvites'
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
  settings: 'تنظیمات، فهرست‌ها، اعضا و حذف اتصال'
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
