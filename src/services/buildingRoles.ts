import { getUserEmail } from './auth'
import {
  memberKindOf,
  memberRulesOf,
  registryOf,
  type MemberKind,
  type MemberRegistry,
  type WorkspaceMember
} from './memberRegistry'
import { getSettings } from './settings'
import { PERIOD_SETTINGS_SHEET } from './sheetNames'
import { getSheetDataRows } from './spreadsheetStore'
import type { BuildingRole } from '../components/buildings/buildingOptions'
import type { Tab } from '../components/layout/types'

/**
 * Roles of a building or a shared account live in «تنظیمات دوره»: `نقش:<email>` = a role of the
 * kind's registry (`memberRegistry.ts`), plus an optional `دسترسی:<email>` JSON of per-permission
 * overrides. This is interface enforcement only: real data access is the Drive share.
 */
export type BuildingPermission = 'record' | 'issue' | 'autoIssue' | 'people' | 'settings'

export type PermissionOverrides = Partial<Record<BuildingPermission, boolean>>

export {
  BUILDING_PERMISSIONS,
  BUILDING_ROLE_PERMISSIONS as ROLE_PERMISSIONS
} from './memberRegistry'

export const ROLE_ROW_PREFIX = 'نقش:'

export const ACCESS_ROW_PREFIX = 'دسترسی:'

/** Pages that need a permission; the drawer drops their rows and the route shows «دسترسی ندارید». */
export const TAB_PERMISSIONS: Partial<Record<Tab, BuildingPermission>> = {
  'building-sms': 'record',
  'building-settings': 'settings',
  'building-members': 'settings',
  'building-lists': 'settings'
}

export interface BuildingMember {
  email: string
  role: BuildingRole
  overrides: PermissionOverrides
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** A role the registry does not know reads as its fallback (building: board, shared: viewer). */
function parseRole(value: string, registry: MemberRegistry): string {
  const role = value.trim()

  return registry.roles.some(option => option.value === role) ? role : registry.fallbackRole
}

function parseOverrides(raw: string, registry: MemberRegistry): WorkspaceMember['overrides'] {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>

    return Object.fromEntries(
      registry.permissions
        .filter(key => typeof parsed[key] === 'boolean')
        .map(key => [key, parsed[key]])
    ) as WorkspaceMember['overrides']
  } catch {
    return {}
  }
}

/** The members of the rows of «تنظیمات دوره», in sheet order (default: a building's rules). */
export function parseMembers(rows: string[][], kind?: 'building'): BuildingMember[]
export function parseMembers(rows: string[][], kind: MemberKind): WorkspaceMember[]
export function parseMembers(rows: string[][], kind: MemberKind = 'building'): WorkspaceMember[] {
  const registry = registryOf(kind)

  const overrides = new Map<string, WorkspaceMember['overrides']>()

  for (const row of rows) {
    const key = String(row[0] ?? '').trim()

    if (key.startsWith(ACCESS_ROW_PREFIX)) {
      overrides.set(
        normalizeEmail(key.slice(ACCESS_ROW_PREFIX.length)),
        parseOverrides(row[1] ?? '', registry)
      )
    }
  }

  const members = new Map<string, WorkspaceMember>()

  for (const row of rows) {
    const key = String(row[0] ?? '').trim()

    if (!key.startsWith(ROLE_ROW_PREFIX)) continue

    const email = normalizeEmail(key.slice(ROLE_ROW_PREFIX.length))

    if (email && !members.has(email)) {
      members.set(email, {
        email,
        role: parseRole(String(row[1] ?? ''), registry),
        overrides: overrides.get(email) ?? {}
      })
    }
  }

  return [...members.values()]
}

/** Effective permission: the member's override, else the default of the role. Unknown = fallback. */
export function memberHasPermission(
  list: readonly WorkspaceMember[],
  email: string | null,
  permission: string,
  kind: MemberKind = 'building'
): boolean {
  const registry = registryOf(kind)

  const member = list.find(item => item.email === normalizeEmail(email ?? ''))

  return (
    member?.overrides[permission] ??
    registry.rolePermissions[member?.role ?? registry.fallbackRole]?.[permission] ??
    false
  )
}

function activeSpreadsheetId(): string {
  return getSettings()?.spreadsheetId ?? ''
}

/**
 * The members of a sheet, read with its kind's rules. Typed as building members by default (the
 * building screens); a shared-account caller names its own member type.
 */
export function members<M extends WorkspaceMember = BuildingMember>(
  spreadsheetId = activeSpreadsheetId()
): NoInfer<M>[] {
  const rows = getSheetDataRows(spreadsheetId, PERIOD_SETTINGS_SHEET) ?? []

  return parseMembers(rows, memberRulesOf(spreadsheetId)) as M[]
}

/** A person the sheet has no role for (shared by hand, say) reads as the kind's fallback role. */
export function roleOf<R extends string = BuildingRole>(
  email: string,
  spreadsheetId?: string
): NoInfer<R> {
  const found = members<WorkspaceMember>(spreadsheetId).find(
    item => item.email === normalizeEmail(email)
  )

  return (found?.role ?? registryOf(memberRulesOf(spreadsheetId)).fallbackRole) as R
}

export function memberCan(email: string, permission: string, spreadsheetId?: string): boolean {
  return memberHasPermission(
    members(spreadsheetId),
    email,
    permission,
    memberRulesOf(spreadsheetId)
  )
}

/** Whether the signed-in user may; a personal spreadsheet has no roles and allows everything. */
export function can(permission: string, spreadsheetId = activeSpreadsheetId()): boolean {
  const kind = memberKindOf(spreadsheetId)

  if (!kind) return true

  return memberHasPermission(members(spreadsheetId), getUserEmail(), permission, kind)
}
