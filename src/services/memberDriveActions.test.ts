import { beforeEach, describe, expect, it, vi } from 'vitest'

import { inviteMember, resendInvite } from './buildingMemberDrive'
import { changeMemberRole, setMemberOverrides } from './buildingMembers'
import { deleteMemberSettings, setMemberSetting } from './buildingSettings'
import { getDefaultSettings, saveSettings } from './settings'
import { setSheetAllRows } from './spreadsheetStore'
import { NOT_MEMBER_FILE_MESSAGE, setWorkspaceType } from './workspace'

const user = vi.hoisted(() => ({ email: 'owner@x.com' }))

const calls = vi.hoisted(() => ({ log: [] as string[] }))

vi.mock('./auth', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getUserEmail: () => user.email,
  getUserName: () => 'امید'
}))

vi.mock('./driveShare', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  shareFile: async (_id: string, email: string, role: string, message?: string) => {
    calls.log.push(`share:${email}:${role}:${message ? 'mail' : 'silent'}`)
  },
  setFileRole: async (_id: string, email: string, role: string) => {
    calls.log.push(`role:${email}:${role}`)
  },
  unshareFile: async (_id: string, email: string) => {
    calls.log.push(`unshare:${email}`)
  }
}))

vi.mock('./sharing', () => ({ refreshSharingInfo: async () => undefined }))

vi.mock('./periodSettings', () => ({
  setPeriodSetting: async (_id: string, key: string, value: string) => {
    calls.log.push(`set:${key}=${value}`)
  },
  deletePeriodSettings: async (_id: string, keys: string[]) => {
    calls.log.push(`delete:${keys.join(',')}`)
  }
}))

const HEADER = ['کلید', 'مقدار', 'زمان ثبت']

const SHARED_ROWS = [
  ['نقش:owner@x.com', 'owner', 't'],
  ['نقش:partner@x.com', 'partner', 't'],
  ['نقش:viewer@x.com', 'viewer', 't']
]

function sheet(id: string, rows: string[][]) {
  setSheetAllRows(id, 'تنظیمات دوره', [HEADER, ...rows])
}

beforeEach(() => {
  calls.log.length = 0
  user.email = 'owner@x.com'
  saveSettings({ ...getDefaultSettings(), spreadsheetId: 's1' })
  setWorkspaceType('s1', 'shared')
  setWorkspaceType('b1', 'building')
  setWorkspaceType('personal-1', 'personal')
  sheet('s1', SHARED_ROWS)
})

describe('member rows are written only into a building or a shared account', () => {
  it('refuses a personal spreadsheet and writes nothing', async () => {
    await expect(setMemberSetting('personal-1', 'نقش:a@b.c', 'partner')).rejects.toThrow(
      NOT_MEMBER_FILE_MESSAGE
    )
    await expect(deleteMemberSettings('personal-1', ['نقش:a@b.c'])).rejects.toThrow(
      NOT_MEMBER_FILE_MESSAGE
    )
    expect(calls.log).toEqual([])
  })

  it('accepts a shared account and a building', async () => {
    await setMemberSetting('s1', 'نقش:a@b.c', 'partner')
    await deleteMemberSettings('s1', ['نقش:a@b.c'])
    await setMemberSetting('b1', 'نقش:a@b.c', 'board')
    expect(calls.log).toEqual(['set:نقش:a@b.c=partner', 'delete:نقش:a@b.c', 'set:نقش:a@b.c=board'])
  })
})

describe('the Drive share follows a writing switch of a shared account', () => {
  it('raises a viewer given a writing switch to «ویرایش», Drive first', async () => {
    expect(await setMemberOverrides('s1', 'viewer@x.com', { settle: true })).toBeNull()
    expect(calls.log).toEqual([
      'role:viewer@x.com:writer',
      'set:دسترسی:viewer@x.com={"settle":true}'
    ])
  })

  it('does not touch Drive for a switch that never writes, or for a role that already writes', async () => {
    await setMemberOverrides('s1', 'viewer@x.com', { export: true })
    await setMemberOverrides('s1', 'partner@x.com', { record: false })
    expect(calls.log).toEqual([
      'set:دسترسی:viewer@x.com={"export":true}',
      'set:دسترسی:partner@x.com={"record":false}'
    ])
  })

  it('lowers the viewer again when the switches go back to the defaults', async () => {
    sheet('s1', [...SHARED_ROWS, ['دسترسی:viewer@x.com', '{"settle":true}', 't']])
    await setMemberOverrides('s1', 'viewer@x.com', {})
    expect(calls.log).toEqual(['role:viewer@x.com:reader', 'set:دسترسی:viewer@x.com={}'])
  })

  it('leaves the Drive share of a building alone', async () => {
    sheet('b1', [
      ['نقش:owner@x.com', 'manager', 't'],
      ['نقش:v@x.com', 'board', 't']
    ])
    await setMemberOverrides('b1', 'v@x.com', { record: true })
    expect(calls.log).toEqual(['set:دسترسی:v@x.com={"record":true}'])
  })
})

describe('«ارسال دوبارهٔ دعوت»', () => {
  it('shares the file again with the member role and an invitation mail', async () => {
    expect(await resendInvite('s1', 'Viewer@x.com', 'خانه')).toBeNull()
    expect(calls.log).toEqual(['share:viewer@x.com:reader:mail'])
  })

  it('needs the member permission and a known member', async () => {
    expect(await resendInvite('s1', 'nobody@x.com', 'خانه')).toBe('unknown')
    user.email = 'partner@x.com'
    expect(await resendInvite('s1', 'viewer@x.com', 'خانه')).toBe('forbidden')
    expect(calls.log).toEqual([])
  })

  it('shares again with «ویرایش» a viewer a writing switch raised', async () => {
    sheet('s1', [...SHARED_ROWS, ['دسترسی:viewer@x.com', '{"settle":true}', 't']])
    expect(await resendInvite('s1', 'viewer@x.com', 'خانه')).toBeNull()
    expect(calls.log).toEqual(['share:viewer@x.com:writer:mail'])
  })
})

describe('the owner of a shared account is fixed', () => {
  it('never invites anyone as owner', async () => {
    expect(await inviteMember('s1', 'new@x.com', 'owner', 'خانه')).toBe('owner-fixed')
    expect(calls.log).toEqual([])
  })

  it('never promotes a member to owner', async () => {
    expect(await changeMemberRole('s1', 'viewer@x.com', 'owner')).toBe('owner-fixed')
    expect(calls.log).toEqual([])
  })

  it('still lets a building give the manager role', async () => {
    sheet('b1', [
      ['نقش:owner@x.com', 'manager', 't'],
      ['نقش:v@x.com', 'board', 't']
    ])
    expect(await changeMemberRole('b1', 'v@x.com', 'manager')).toBeNull()
    expect(calls.log).toEqual(['role:v@x.com:writer', 'set:نقش:v@x.com=manager'])
  })
})
