import type { BuildingPermission } from './buildingRoles'
import type { DriveShareRole } from './driveShare'
import { workspaceTypeOf } from './workspace'
import {
  BUILDING_ROLES,
  SHARED_ROLES,
  type BuildingRole
} from '../components/buildings/buildingOptions'

/**
 * Members, roles and permissions as data keyed by workspace type: a building («ساختمان») and a
 * shared account («حساب مشترک») share one member engine (`buildingRoles`, `buildingMembers`,
 * `buildingMemberDrive`, `buildingInvites`) and differ only in this registry. A personal sheet
 * has no members. Kept free of service imports so the engine can read it without a cycle.
 */
export type MemberKind = 'building' | 'shared'

export type SharedRole = 'owner' | 'partner' | 'viewer'

export type SharedPermission = 'record' | 'editOthers' | 'settle' | 'budget' | 'members' | 'export'

export type MemberRole = BuildingRole | SharedRole

/** A member of either kind; the role and override keys belong to the kind's registry. */
export interface WorkspaceMember {
  email: string
  role: string
  overrides: Partial<Record<string, boolean>>
}

export interface MemberRegistry {
  roles: { value: string; label: string; hint?: string }[]
  permissions: string[]
  permissionLabels: Record<string, string>
  rolePermissions: Record<string, Record<string, boolean>>
  driveRole: Record<string, DriveShareRole>
  /** The permissions that change data: a read-only member holding one needs Drive «ویرایش». */
  writePermissions: string[]
  /** The role the sheet must always keep one of (the last one cannot leave or change). */
  ownerRole: string
  /** Nobody is invited or promoted to `ownerRole` (the shared account's owner owns the file). */
  ownerFixed: boolean
  defaultInviteRole: string
  /** The permission that manages members (invite, role, switches, removal). */
  settingsPermission: string
  lastOwnerMessage: string
  /** «ساختمان» / «حساب مشترک»: what the file is called in invitations and errors. */
  fileNoun: string
  /** The menu path the invitee follows to connect the existing sheet. */
  connectPath: string
  /** The option to tap at the end of `connectPath`, when the path does not end in it. */
  connectAction: string
  /** A person the sheet has no role row for (shared by hand, say) reads as this role. */
  fallbackRole: string
  /** A role at most one member may hold, or null. */
  singleRole: string | null
  /** A read-only member given a writing switch is raised to Drive «ویرایش» (and back). */
  raisesDriveOnWrite: boolean
}

export const BUILDING_PERMISSIONS: BuildingPermission[] = [
  'record',
  'issue',
  'autoIssue',
  'people',
  'settings'
]

/** Reading (dashboard, units, reports, statements, …) is open to every role and has no entry. */
export const BUILDING_ROLE_PERMISSIONS: Record<
  BuildingRole,
  Record<BuildingPermission, boolean>
> = {
  manager: { record: true, issue: true, autoIssue: true, people: true, settings: true },
  accountant: { record: true, issue: true, autoIssue: false, people: true, settings: false },
  board: { record: false, issue: false, autoIssue: false, people: false, settings: false }
}

export const BUILDING_PERMISSION_LABELS: Record<BuildingPermission, string> = {
  record: 'ثبت پرداخت، هزینه، درآمد، چک، پیامک و تسویه',
  issue: 'صدور دستی شارژ',
  autoIssue: 'صدور خودکار شارژ',
  people: 'ویرایش واحدها، ساکنان و طرف حساب‌ها',
  settings: 'تنظیمات، فهرست‌ها، اعضا و جدا کردن ساختمان'
}

/** The single source of what a building role may do in Drive: «ویرایش» for the ones who write. */
export const BUILDING_DRIVE_ROLE: Record<BuildingRole, DriveShareRole> = {
  manager: 'writer',
  accountant: 'writer',
  board: 'reader'
}

export const SHARED_PERMISSIONS: SharedPermission[] = [
  'record',
  'editOthers',
  'settle',
  'budget',
  'members',
  'export'
]

/** The permission table of the spec (wireframes/shared-account/SPEC.md, «Roles and permissions»). */
export const SHARED_ROLE_PERMISSIONS: Record<SharedRole, Record<SharedPermission, boolean>> = {
  owner: {
    record: true,
    editOthers: true,
    settle: true,
    budget: true,
    members: true,
    export: true
  },
  partner: {
    record: true,
    editOthers: false,
    settle: true,
    budget: true,
    members: false,
    export: true
  },
  viewer: {
    record: false,
    editOthers: false,
    settle: false,
    budget: false,
    members: false,
    export: false
  }
}

export const SHARED_PERMISSION_LABELS: Record<SharedPermission, string> = {
  record: 'ثبت هزینه و درآمد',
  editOthers: 'ویرایش و حذف ثبت‌های دیگران',
  settle: 'ثبت تسویه',
  budget: 'بودجه و دسته‌ها',
  members: 'دعوت و مدیریت اعضا',
  export: 'خروجی و پشتیبان'
}

export const SHARED_DRIVE_ROLE: Record<SharedRole, DriveShareRole> = {
  owner: 'writer',
  partner: 'writer',
  viewer: 'reader'
}

const REGISTRIES: Record<MemberKind, MemberRegistry> = {
  building: {
    roles: BUILDING_ROLES,
    permissions: BUILDING_PERMISSIONS,
    permissionLabels: BUILDING_PERMISSION_LABELS,
    rolePermissions: BUILDING_ROLE_PERMISSIONS,
    driveRole: BUILDING_DRIVE_ROLE,
    writePermissions: ['record', 'issue', 'people', 'settings'],
    ownerRole: 'manager',
    ownerFixed: false,
    defaultInviteRole: 'accountant',
    settingsPermission: 'settings',
    lastOwnerMessage: 'ساختمان باید حداقل یک مدیر داشته باشد',
    fileNoun: 'ساختمان',
    connectPath: 'بیشتر › فضاهای من',
    connectAction: 'اتصال به شیت موجود',
    fallbackRole: 'board',
    singleRole: null,
    raisesDriveOnWrite: false
  },
  shared: {
    roles: SHARED_ROLES,
    permissions: SHARED_PERMISSIONS,
    permissionLabels: SHARED_PERMISSION_LABELS,
    rolePermissions: SHARED_ROLE_PERMISSIONS,
    driveRole: SHARED_DRIVE_ROLE,
    writePermissions: ['record', 'editOthers', 'settle', 'budget', 'members'],
    ownerRole: 'owner',
    ownerFixed: true,
    defaultInviteRole: 'partner',
    settingsPermission: 'members',
    lastOwnerMessage: 'مالک حساب مشترک را نمی‌توان حذف کرد یا نقشش را عوض کرد',
    fileNoun: 'حساب مشترک',
    connectPath: 'بیشتر › فضاهای من › اتصال به حساب مشترک',
    connectAction: '',
    fallbackRole: 'viewer',
    singleRole: 'partner',
    raisesDriveOnWrite: true
  }
}

export function registryOf(kind: MemberKind): MemberRegistry {
  return REGISTRIES[kind]
}

/** The member kind of `spreadsheetId` (default: the active sheet); null for a personal sheet. */
export function memberKindOf(spreadsheetId?: string): MemberKind | null {
  const type = workspaceTypeOf(spreadsheetId)

  return type === 'personal' ? null : type
}

/** The kind whose rules apply to the members of a sheet; a personal sheet keeps the building's. */
export function memberRulesOf(spreadsheetId?: string): MemberKind {
  return memberKindOf(spreadsheetId) ?? 'building'
}
