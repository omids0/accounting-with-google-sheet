import { getUserEmail } from './auth'
import { getSettings } from './settings'
import { PERIOD_SETTINGS_SHEET } from './sheetNames'
import { getSheetDataRows } from './spreadsheetStore'
import { getWorkspaceType } from './workspace'
import type { BuildingRole } from '../components/buildings/buildingOptions'
import type { Tab } from '../components/layout/types'

/**
 * Roles of a building workspace live in «تنظیمات دوره»: `نقش:<email>` = manager | accountant | board,
 * plus an optional `دسترسی:<email>` JSON of per-permission overrides. This is interface enforcement
 * only: real data access is the Drive share (مدیر and حسابدار edit, عضو هیئت مدیره views).
 */
export type BuildingPermission = 'record' | 'issue' | 'autoIssue' | 'people' | 'settings'

export type PermissionOverrides = Partial<Record<BuildingPermission, boolean>>

export const BUILDING_PERMISSIONS: BuildingPermission[] = [
  'record',
  'issue',
  'autoIssue',
  'people',
  'settings'
]

export const ROLE_ROW_PREFIX = 'نقش:'

export const ACCESS_ROW_PREFIX = 'دسترسی:'

/** Reading (dashboard, units, reports, statements, …) is open to every role and has no entry. */
export const ROLE_PERMISSIONS: Record<BuildingRole, Record<BuildingPermission, boolean>> = {
  manager: { record: true, issue: true, autoIssue: true, people: true, settings: true },
  accountant: { record: true, issue: true, autoIssue: false, people: true, settings: false },
  board: { record: false, issue: false, autoIssue: false, people: false, settings: false }
}

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

function parseRole(value: string): BuildingRole {
  const role = value.trim()

  return role === 'manager' || role === 'accountant' ? role : 'board'
}

function parseOverrides(raw: string): PermissionOverrides {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>

    return Object.fromEntries(
      BUILDING_PERMISSIONS.filter(key => typeof parsed[key] === 'boolean').map(key => [
        key,
        parsed[key]
      ])
    ) as PermissionOverrides
  } catch {
    return {}
  }
}

/** The members of the rows of «تنظیمات دوره», in sheet order. */
export function parseMembers(rows: string[][]): BuildingMember[] {
  const overrides = new Map<string, PermissionOverrides>()

  for (const row of rows) {
    const key = String(row[0] ?? '').trim()

    if (key.startsWith(ACCESS_ROW_PREFIX)) {
      overrides.set(
        normalizeEmail(key.slice(ACCESS_ROW_PREFIX.length)),
        parseOverrides(row[1] ?? '')
      )
    }
  }

  const members = new Map<string, BuildingMember>()

  for (const row of rows) {
    const key = String(row[0] ?? '').trim()

    if (!key.startsWith(ROLE_ROW_PREFIX)) continue

    const email = normalizeEmail(key.slice(ROLE_ROW_PREFIX.length))

    if (email && !members.has(email)) {
      members.set(email, {
        email,
        role: parseRole(String(row[1] ?? '')),
        overrides: overrides.get(email) ?? {}
      })
    }
  }

  return [...members.values()]
}

/** Effective permission: the member's override, else the default of the role. Unknown = board. */
export function memberHasPermission(
  list: BuildingMember[],
  email: string | null,
  permission: BuildingPermission
): boolean {
  const member = list.find(item => item.email === normalizeEmail(email ?? ''))

  return member?.overrides[permission] ?? ROLE_PERMISSIONS[member?.role ?? 'board'][permission]
}

function activeSpreadsheetId(): string {
  return getSettings()?.spreadsheetId ?? ''
}

export function members(spreadsheetId = activeSpreadsheetId()): BuildingMember[] {
  return parseMembers(getSheetDataRows(spreadsheetId, PERIOD_SETTINGS_SHEET) ?? [])
}

/** A person the sheet has no role for (shared by hand, say) reads as a board member. */
export function roleOf(email: string, spreadsheetId?: string): BuildingRole {
  return members(spreadsheetId).find(item => item.email === normalizeEmail(email))?.role ?? 'board'
}

export function memberCan(
  email: string,
  permission: BuildingPermission,
  spreadsheetId?: string
): boolean {
  return memberHasPermission(members(spreadsheetId), email, permission)
}

/** Whether the signed-in user may; a personal spreadsheet has no roles and allows everything. */
export function can(
  permission: BuildingPermission,
  spreadsheetId = activeSpreadsheetId()
): boolean {
  if (getWorkspaceType(spreadsheetId) !== 'building') return true

  return memberHasPermission(members(spreadsheetId), getUserEmail(), permission)
}
