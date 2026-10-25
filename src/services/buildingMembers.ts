import { getUserEmail } from './auth'
import { INVITE_ROW_PREFIX } from './buildingInvites'
import { revokeMemberDrive, syncMemberDriveRole } from './buildingMemberDrive'
import {
  ACCESS_ROW_PREFIX,
  can,
  members,
  ROLE_ROW_PREFIX,
  type BuildingPermission,
  type PermissionOverrides
} from './buildingRoles'
import { deleteMemberSettings, setMemberSetting } from './buildingSettings'
import type { MemberBlock } from './memberMessages'
import {
  BUILDING_PERMISSION_LABELS,
  memberRulesOf,
  registryOf,
  type MemberKind,
  type MemberRole,
  type WorkspaceMember
} from './memberRegistry'
import type { BuildingRole } from '../components/buildings/buildingOptions'

/**
 * Member mutations of a building or a shared account (round 11, Step 9), all rows of «تنظیمات
 * دوره»: the role (`نقش:<email>`), the per-permission overrides (`دسترسی:<email>`) and the invite
 * marker. Every writer re-checks the kind's member permission and the guards, so a stale screen
 * cannot lock the sheet out of its last owner. A new role and a removal also change the Drive
 * share, the real access. The rules come from the kind's registry (`memberRegistry.ts`).
 */
export type { MemberBlock } from './memberMessages'

export { MEMBER_BLOCK_MESSAGES, memberBlockMessages } from './memberMessages'

export {
  activityWriters,
  claimOwnInvite,
  markMemberActive,
  MEMBER_STATUS_LABELS,
  memberStatus,
  memberStatusReader,
  type MemberStatus
} from './buildingMemberStatus'

export const PERMISSION_LABELS: Record<BuildingPermission, string> = BUILDING_PERMISSION_LABELS

type Overrides = WorkspaceMember['overrides']

const normalizeEmail = (email: string) => email.trim().toLowerCase()

export function isCustom(member: WorkspaceMember): boolean {
  return Object.keys(member.overrides).length > 0
}

export function effectivePermission(
  member: WorkspaceMember,
  permission: string,
  kind: MemberKind = 'building'
): boolean {
  return (
    member.overrides[permission] ??
    registryOf(kind).rolePermissions[member.role]?.[permission] ??
    false
  )
}

/** The overrides after switching `permission`; a value equal to the role's default is dropped. */
export function withOverride(
  member: WorkspaceMember,
  permission: string,
  value: boolean,
  kind: MemberKind = 'building'
): Overrides {
  const next = { ...member.overrides }

  if ((registryOf(kind).rolePermissions[member.role]?.[permission] ?? false) === value)
    delete next[permission]
  else next[permission] = value

  return next
}

/** A read-only member (Drive: view only) who was given a permission that writes. */
export function viewerCanWrite(member: WorkspaceMember, kind: MemberKind = 'building'): boolean {
  const registry = registryOf(kind)

  return (
    registry.driveRole[member.role] === 'reader' &&
    registry.writePermissions.some(permission => effectivePermission(member, permission, kind))
  )
}

/** «ویرایش» / «فقط مشاهده»: the Drive access a role of the kind gets. */
export function driveAccessLabel(role: string, kind: MemberKind = 'building'): string {
  return registryOf(kind).driveRole[role] === 'writer' ? 'ویرایش' : 'فقط مشاهده'
}

export const DRIVE_ACCESS: Record<BuildingRole, string> = {
  manager: driveAccessLabel('manager'),
  accountant: driveAccessLabel('accountant'),
  board: driveAccessLabel('board')
}

/** What stops `email` from being changed (role, switches) or removed; null when nothing does. */
export function memberBlock(
  list: readonly WorkspaceMember[],
  email: string,
  selfEmail: string | null,
  action: 'change' | 'remove',
  nextRole?: string,
  kind: MemberKind = 'building'
): MemberBlock | null {
  const { ownerRole, singleRole } = registryOf(kind)

  const target = list.find(item => item.email === normalizeEmail(email))

  if (!target) return 'unknown'

  const losesOwner =
    target.role === ownerRole && (action === 'remove' || (nextRole && nextRole !== ownerRole))

  if (losesOwner && list.filter(item => item.role === ownerRole).length <= 1) return 'last-manager'
  if (normalizeEmail(selfEmail ?? '') === target.email) return 'self'

  const takesSingleRole =
    action === 'change' &&
    nextRole === singleRole &&
    list.some(item => item.role === singleRole && item.email !== target.email)

  return takesSingleRole ? 'partner-limit' : null
}

function guard(
  spreadsheetId: string,
  email: string,
  action: 'change' | 'remove',
  nextRole?: string
): MemberBlock | null {
  const kind = memberRulesOf(spreadsheetId)

  if (!can(registryOf(kind).settingsPermission, spreadsheetId)) return 'forbidden'

  return memberBlock(members(spreadsheetId), email, getUserEmail(), action, nextRole, kind)
}

/** A new role replaces the member's own switches: the overrides are cleared. */
export async function changeMemberRole(
  spreadsheetId: string,
  email: string,
  role: MemberRole
): Promise<MemberBlock | null> {
  const block = guard(spreadsheetId, email, 'change', role)

  if (block) return block

  const key = normalizeEmail(email)

  const member = members<WorkspaceMember>(spreadsheetId).find(item => item.email === key)

  if (member?.role === role) return null
  await syncMemberDriveRole(spreadsheetId, key, role)
  await setMemberSetting(spreadsheetId, ROLE_ROW_PREFIX + key, role)
  if (member && isCustom(member))
    await setMemberSetting(spreadsheetId, ACCESS_ROW_PREFIX + key, '{}')

  return null
}

/** Stores the member's overrides (`{}` = back to the defaults of the role). */
export async function setMemberOverrides(
  spreadsheetId: string,
  email: string,
  overrides: Overrides | PermissionOverrides
): Promise<MemberBlock | null> {
  const block = guard(spreadsheetId, email, 'change')

  if (block) return block

  const source: Overrides = overrides

  const clean = Object.fromEntries(
    registryOf(memberRulesOf(spreadsheetId))
      .permissions.filter(key => typeof source[key] === 'boolean')
      .map(key => [key, source[key]])
  )

  await setMemberSetting(
    spreadsheetId,
    ACCESS_ROW_PREFIX + normalizeEmail(email),
    JSON.stringify(clean)
  )

  return null
}

/** «قطع دسترسی»: takes the Drive share back first, then drops the member's rows. */
export async function removeMember(
  spreadsheetId: string,
  email: string
): Promise<MemberBlock | null> {
  const block = guard(spreadsheetId, email, 'remove')

  if (block) return block

  const key = normalizeEmail(email)

  await revokeMemberDrive(spreadsheetId, key)
  await deleteMemberSettings(spreadsheetId, [
    ROLE_ROW_PREFIX + key,
    ACCESS_ROW_PREFIX + key,
    INVITE_ROW_PREFIX + key
  ])

  return null
}
