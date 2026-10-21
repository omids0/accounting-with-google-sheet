import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  BUILDING_PERMISSIONS,
  can,
  memberCan,
  memberHasPermission,
  members,
  parseMembers,
  roleOf,
  ROLE_PERMISSIONS,
  TAB_PERMISSIONS
} from './buildingRoles'
import { getDefaultSettings, saveSettings } from './settings'
import { setSheetAllRows } from './spreadsheetStore'
import { setWorkspaceType } from './workspace'

const user = vi.hoisted(() => ({ email: 'manager@x.com' }))

vi.mock('./auth', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getUserEmail: () => user.email
}))

const ROWS = [
  ['نقش:Manager@X.com', 'manager', 't'],
  ['نقش:acc@x.com', 'accountant', 't'],
  ['نقش:board@x.com', 'board', 't'],
  ['نقش:odd@x.com', 'something-else', 't'],
  ['دسترسی:acc@x.com', '{"settings":true,"record":false,"junk":1}', 't'],
  ['دسترسی:broken@x.com', 'not json', 't'],
  ['فهرست:EXPENSE_KINDS', '[]', 't']
]

describe('building roles', () => {
  it('reads members from the role rows, e-mails lower-cased, unknown roles as board', () => {
    expect(parseMembers(ROWS).map(({ email, role }) => [email, role])).toEqual([
      ['manager@x.com', 'manager'],
      ['acc@x.com', 'accountant'],
      ['board@x.com', 'board'],
      ['odd@x.com', 'board']
    ])
  })

  it('keeps only valid boolean overrides', () => {
    expect(parseMembers(ROWS).find(item => item.email === 'acc@x.com')?.overrides).toEqual({
      settings: true,
      record: false
    })
  })

  it('gives each role the table of the spec', () => {
    const list = parseMembers(ROWS)

    const row = (email: string) =>
      BUILDING_PERMISSIONS.map(permission => memberHasPermission(list, email, permission))

    // record, issue, autoIssue, people, settings
    expect(row('manager@x.com')).toEqual([true, true, true, true, true])
    expect(row('board@x.com')).toEqual([false, false, false, false, false])
    expect(ROLE_PERMISSIONS.accountant).toEqual({
      record: true,
      issue: true,
      autoIssue: false,
      people: true,
      settings: false
    })
  })

  it('lets a member override win over the role default, both ways', () => {
    const list = parseMembers(ROWS)

    expect(memberHasPermission(list, 'acc@x.com', 'settings')).toBe(true)
    expect(memberHasPermission(list, 'acc@x.com', 'record')).toBe(false)
    expect(memberHasPermission(list, 'acc@x.com', 'issue')).toBe(true)
  })

  it('treats an unknown person as a board member', () => {
    expect(memberHasPermission(parseMembers(ROWS), 'nobody@x.com', 'record')).toBe(false)
    expect(memberHasPermission(parseMembers(ROWS), null, 'record')).toBe(false)
  })

  it('gates the settings pages and the bank SMS page', () => {
    expect(TAB_PERMISSIONS['building-settings']).toBe('settings')
    expect(TAB_PERMISSIONS['building-members']).toBe('settings')
    expect(TAB_PERMISSIONS['building-lists']).toBe('settings')
    expect(TAB_PERMISSIONS['building-sms']).toBe('record')
    expect(TAB_PERMISSIONS['building-dashboard']).toBeUndefined()
  })
})

describe('roles of the active spreadsheet', () => {
  beforeEach(() => {
    localStorage.clear()
    saveSettings({
      ...getDefaultSettings(),
      spreadsheetId: 'b1',
      spreadsheets: [{ id: 'b1', name: 'ساختمان', createdAt: '' }]
    })
    setSheetAllRows('b1', 'تنظیمات دوره', [['کلید', 'مقدار', 'زمان ثبت'], ...ROWS])
  })

  it('answers from the mirrored «تنظیمات دوره»', () => {
    expect(members()).toHaveLength(4)
    expect(roleOf('ACC@x.com')).toBe('accountant')
    expect(roleOf('stranger@x.com')).toBe('board')
    expect(memberCan('acc@x.com', 'issue')).toBe(true)
    expect(memberCan('board@x.com', 'issue')).toBe(false)
  })

  it('can() asks about the signed-in user inside a building', () => {
    setWorkspaceType('b1', 'building')

    user.email = 'manager@x.com'
    expect(can('settings')).toBe(true)
    user.email = 'acc@x.com'
    expect(can('autoIssue')).toBe(false)
    user.email = 'board@x.com'
    expect(can('record')).toBe(false)
  })

  it('lets everything through in a personal workspace', () => {
    user.email = 'board@x.com'

    expect(can('settings')).toBe(true)
  })
})
