import { beforeEach, describe, expect, it, vi } from 'vitest'

import { inviteMessage, inviteText } from './buildingInvites'
import { INVITE_BLOCK_MESSAGES, inviteMember } from './buildingMemberDrive'
import {
  changeMemberRole,
  memberBlock,
  memberBlockMessages,
  removeMember,
  setMemberOverrides
} from './buildingMembers'
import { claimOwnInvite, markMemberActive } from './buildingMemberStatus'
import { can, memberCan, parseMembers, roleOf } from './buildingRoles'
import { shareErrorMessage } from './driveShare'
import { inviteBlockMessages } from './memberMessages'
import { getDefaultSettings, saveSettings } from './settings'
import { SheetsApiError } from './sheetsApi'
import { setSheetAllRows } from './spreadsheetStore'
import { setWorkspaceType } from './workspace'

const user = vi.hoisted(() => ({ email: 'owner@x.com' }))

const calls = vi.hoisted(() => ({ log: [] as string[] }))

vi.mock('./auth', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getUserEmail: () => user.email,
  getUserName: () => 'امید'
}))

vi.mock('./driveShare', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  shareFile: async (_id: string, email: string, role: string) => {
    calls.log.push(`share:${email}:${role}`)
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

const OWNER = ['نقش:owner@x.com', 'owner', 't']

const PARTNER = ['نقش:partner@x.com', 'partner', 't']

const VIEWER = ['نقش:viewer@x.com', 'viewer', 't']

function sheet(rows: string[][]) {
  setSheetAllRows('s1', 'تنظیمات دوره', [HEADER, ...rows])
}

beforeEach(() => {
  calls.log.length = 0
  user.email = 'owner@x.com'
  saveSettings({ ...getDefaultSettings(), spreadsheetId: 's1' })
  setWorkspaceType('s1', 'shared')
  setWorkspaceType('p1', 'personal')
  sheet([OWNER, PARTNER, VIEWER, ['نقش:odd@x.com', 'manager', 't']])
})

describe('roles of a shared account', () => {
  it('reads unknown roles as viewer', () => {
    expect(parseMembers([['نقش:a@x.com', 'board']], 'shared')[0].role).toBe('viewer')
    expect(roleOf('odd@x.com', 's1')).toBe('viewer')
    expect(roleOf('stranger@x.com', 's1')).toBe('viewer')
    expect(roleOf('partner@x.com', 's1')).toBe('partner')
  })

  it('can() follows the role table: the viewer never writes', () => {
    user.email = 'viewer@x.com'
    expect(can('record', 's1')).toBe(false)
    expect(can('export', 's1')).toBe(false)
    user.email = 'owner@x.com'
    expect(can('record', 's1')).toBe(true)
    expect(can('members', 's1')).toBe(true)
    user.email = 'partner@x.com'
    expect(can('record')).toBe(true)
    expect(can('editOthers')).toBe(false)
    expect(can('members')).toBe(false)
    user.email = 'stranger@x.com'
    expect(can('record', 's1')).toBe(false)
  })

  it('applies a member override and ignores building permissions', () => {
    sheet([OWNER, VIEWER, ['دسترسی:viewer@x.com', '{"settle":true,"issue":true}', 't']])

    expect(memberCan('viewer@x.com', 'settle', 's1')).toBe(true)
    expect(memberCan('viewer@x.com', 'issue', 's1')).toBe(false)
    expect(memberCan('owner@x.com', 'settings', 's1')).toBe(false)
  })

  it('still lets everything through in a personal sheet', () => {
    user.email = 'viewer@x.com'
    expect(can('record', 'p1')).toBe(true)
  })
})

describe('member guards of a shared account', () => {
  const list = parseMembers([OWNER, PARTNER, VIEWER], 'shared')

  it('keeps the only owner', () => {
    expect(memberBlock(list, 'owner@x.com', 'partner@x.com', 'remove', undefined, 'shared')).toBe(
      'last-manager'
    )
    expect(memberBlock(list, 'owner@x.com', 'partner@x.com', 'change', 'viewer', 'shared')).toBe(
      'last-manager'
    )
    expect(memberBlockMessages('shared')['last-manager']).toContain('مالک')
  })

  it('never lets anyone switch off the owner’s own permissions', () => {
    expect(memberBlock(list, 'owner@x.com', 'partner@x.com', 'change', undefined, 'shared')).toBe(
      'owner-fixed'
    )
    expect(memberBlock(list, 'partner@x.com', 'owner@x.com', 'change', undefined, 'shared')).toBe(
      null
    )
  })

  it('refuses a change of yourself and a second partner', () => {
    expect(memberBlock(list, 'viewer@x.com', 'viewer@x.com', 'change', 'partner', 'shared')).toBe(
      'self'
    )
    expect(memberBlock(list, 'viewer@x.com', 'owner@x.com', 'change', 'partner', 'shared')).toBe(
      'partner-limit'
    )
    expect(memberBlock(list, 'partner@x.com', 'owner@x.com', 'change', 'viewer', 'shared')).toBe(
      null
    )
  })

  it('needs `members` to change anyone', async () => {
    user.email = 'partner@x.com'
    expect(await changeMemberRole('s1', 'viewer@x.com', 'partner')).toBe('forbidden')
    expect(await removeMember('s1', 'viewer@x.com')).toBe('forbidden')
    expect(await markMemberActive('s1', 'viewer@x.com')).toBe('forbidden')
    expect(memberBlockMessages('shared').forbidden).toContain('دعوت و مدیریت اعضا')
    expect(calls.log).toEqual([])
  })

  it('writes the role, the overrides and the Drive share in the shared sheet', async () => {
    sheet([OWNER, VIEWER])

    expect(await changeMemberRole('s1', 'viewer@x.com', 'partner')).toBeNull()
    expect(
      await setMemberOverrides('s1', 'viewer@x.com', { budget: false, issue: true })
    ).toBeNull()
    expect(await removeMember('s1', 'viewer@x.com')).toBeNull()
    expect(calls.log).toEqual([
      'role:viewer@x.com:writer',
      'set:نقش:viewer@x.com=partner',
      'set:دسترسی:viewer@x.com={"budget":false}',
      'unshare:viewer@x.com',
      'delete:نقش:viewer@x.com,دسترسی:viewer@x.com,دعوت:viewer@x.com'
    ])
  })
})

describe('inviting to a shared account', () => {
  it('refuses a second partner before anything is shared', async () => {
    expect(await inviteMember('s1', 'new@x.com', 'partner', 'خانه')).toBe('partner-limit')
    expect(calls.log).toEqual([])
    expect(inviteBlockMessages('shared')['partner-limit']).toContain('شریک')
  })

  it('shares a viewer as reader, then writes the rows', async () => {
    expect(await inviteMember('s1', 'new@x.com', 'viewer', 'خانه')).toBeNull()
    expect(calls.log[0]).toBe('share:new@x.com:reader')
    expect(calls.log[1]).toBe('set:نقش:new@x.com=viewer')
  })

  it('invites the first partner as writer', async () => {
    sheet([OWNER])
    expect(await inviteMember('s1', 'p2@x.com', 'partner', 'خانه')).toBeNull()
    expect(calls.log[0]).toBe('share:p2@x.com:writer')
  })

  it('keeps the building messages for a building', () => {
    expect(inviteBlockMessages('building')).toBe(INVITE_BLOCK_MESSAGES)
    expect(inviteBlockMessages('shared').exists).not.toContain('ساختمان')
  })

  it('writes the invitation for a shared account', () => {
    const text = inviteMessage({
      inviterName: '',
      buildingName: 'خانه',
      role: 'partner',
      kind: 'shared'
    })

    expect(text).toContain(
      'مالک حساب مشترک شما را به حساب مشترک «خانه» با نقش «شریک» دعوت کرده است.'
    )
    expect(text).toContain('بیشتر › فضاهای من › اتصال به حساب مشترک')
    expect(text).not.toContain('ساختمان')

    const copy = inviteText('خانه', 'viewer', 'https://sheet', {}, 'shared')

    expect(copy).toContain('دعوت به حساب مشترک «خانه»')
    expect(copy).toContain('نقش شما: ناظر')
    expect(copy).not.toContain('ساختمان')
  })
})

describe('own invite of a shared account', () => {
  it('a partner clears their own invite; a viewer does not', async () => {
    sheet([
      OWNER,
      PARTNER,
      VIEWER,
      ['دعوت:partner@x.com', 'd', 't'],
      ['دعوت:viewer@x.com', 'd', 't']
    ])
    user.email = 'viewer@x.com'
    expect(await claimOwnInvite('s1')).toBe(false)
    user.email = 'partner@x.com'
    expect(await claimOwnInvite('s1')).toBe(true)
    expect(calls.log).toEqual(['delete:دعوت:partner@x.com'])
  })
})

describe('shareErrorMessage', () => {
  it('names the file of the workspace on 404', () => {
    const missing = new SheetsApiError('gone', 404)

    expect(shareErrorMessage(missing, 'x', 'حساب مشترک')).toContain('حساب مشترک')
    expect(shareErrorMessage(missing)).toBe('فایل ساختمان در حساب گوگل شما پیدا نشد')
  })
})
