import { beforeEach, describe, expect, it } from 'vitest'

import { DRIVE_ROLE } from './buildingMemberDrive'
import { PERMISSION_LABELS, viewerCanWrite } from './buildingMembers'
import { BUILDING_PERMISSIONS, ROLE_PERMISSIONS } from './buildingRoles'
import { memberKindOf, registryOf } from './memberRegistry'
import { setWorkspaceType } from './workspace'
import { BUILDING_ROLES, SHARED_ROLES } from '../components/buildings/buildingOptions'

const shared = registryOf('shared')

/** The permission table of UX-FAMILY-SPEC.md, cell by cell. */
const SPEC_TABLE = {
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

describe('shared registry', () => {
  it('has the three roles of the spec with their labels', () => {
    expect(shared.roles.map(({ value, label }) => [value, label])).toEqual([
      ['owner', 'مالک'],
      ['partner', 'شریک'],
      ['viewer', 'ناظر']
    ])
    expect(shared.roles).toBe(SHARED_ROLES)
  })

  it('lists the six permissions in spec order with their labels', () => {
    expect(shared.permissions).toEqual([
      'record',
      'editOthers',
      'settle',
      'budget',
      'members',
      'export'
    ])
    expect(shared.permissionLabels).toEqual({
      record: 'ثبت هزینه و درآمد',
      editOthers: 'ویرایش و حذف ثبت‌های دیگران',
      settle: 'ثبت تسویه',
      budget: 'بودجه و دسته‌ها',
      members: 'دعوت و مدیریت اعضا',
      export: 'خروجی و پشتیبان'
    })
  })

  it('gives every role the defaults of the spec table', () => {
    expect(shared.rolePermissions).toEqual(SPEC_TABLE)
  })

  it('maps owner and partner to Drive «ویرایش» and the viewer to «فقط مشاهده»', () => {
    expect(shared.driveRole).toEqual({ owner: 'writer', partner: 'writer', viewer: 'reader' })
  })

  it('names the owner, the invite default, the member permission and the file', () => {
    expect(shared.ownerRole).toBe('owner')
    expect(shared.defaultInviteRole).toBe('partner')
    expect(shared.settingsPermission).toBe('members')
    expect(shared.fileNoun).toBe('حساب مشترک')
    expect(shared.connectPath).toBe('بیشتر › فضاهای من › اتصال به حساب مشترک')
    expect(shared.writePermissions).toEqual(['record', 'editOthers', 'settle', 'budget', 'members'])
  })

  it('takes a viewer given a writing permission for one who needs Drive «ویرایش»', () => {
    const viewer = { email: 'v@x.com', role: 'viewer', overrides: {} }

    expect(viewerCanWrite(viewer, 'shared')).toBe(false)
    expect(viewerCanWrite({ ...viewer, overrides: { settle: true } }, 'shared')).toBe(true)
    expect(viewerCanWrite({ ...viewer, overrides: { export: true } }, 'shared')).toBe(false)
    expect(viewerCanWrite({ ...viewer, role: 'partner' }, 'shared')).toBe(false)
  })
})

describe('building registry', () => {
  it('is the building data unchanged', () => {
    const building = registryOf('building')

    expect(building.roles).toBe(BUILDING_ROLES)
    expect(building.permissions).toEqual(BUILDING_PERMISSIONS)
    expect(building.rolePermissions).toEqual(ROLE_PERMISSIONS)
    expect(building.driveRole).toEqual(DRIVE_ROLE)
    expect(building.permissionLabels).toEqual(PERMISSION_LABELS)
    expect(building.ownerRole).toBe('manager')
    expect(building.settingsPermission).toBe('settings')
    expect(building.fileNoun).toBe('ساختمان')
    expect(building.connectPath).toBe('بیشتر › فضاهای من')
  })
})

describe('memberKindOf', () => {
  beforeEach(() => {
    setWorkspaceType('b-kind', 'building')
    setWorkspaceType('s-kind', 'shared')
  })

  it('answers the member kind of a sheet, null for a personal one', () => {
    expect(memberKindOf('b-kind')).toBe('building')
    expect(memberKindOf('s-kind')).toBe('shared')
    expect(memberKindOf('p-kind')).toBeNull()
  })
})
