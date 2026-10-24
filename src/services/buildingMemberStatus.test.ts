import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  activityWriters,
  claimOwnInvite,
  markMemberActive,
  memberStatus,
  memberStatusReader
} from './buildingMembers'
import { getDefaultSettings, saveSettings } from './settings'
import { ACTIVITY_LOG_HEADERS } from './sheetHeaders'
import { ACTIVITY_LOG_SHEET, PERIOD_SETTINGS_SHEET } from './sheetNames'
import { setSheetAllRows } from './spreadsheetStore'
import { setWorkspaceType } from './workspace'

const user = vi.hoisted(() => ({ email: 'boss@x.com' }))

const removed = vi.hoisted(() => ({ keys: [] as string[][], fail: false }))

vi.mock('./auth', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getUserEmail: () => user.email
}))

vi.mock('./periodSettings', () => ({
  setPeriodSetting: async () => undefined,
  deletePeriodSettings: async (_id: string, keys: string[]) => {
    if (removed.fail) throw new Error('offline')
    removed.keys.push(keys)
  }
}))

const HEADER = ['کلید', 'مقدار', 'زمان ثبت']

const rows = (invites: string[]) => [
  ['نقش:boss@x.com', 'manager', 't'],
  ['نقش:acc@x.com', 'accountant', 't'],
  ['نقش:board@x.com', 'board', 't'],
  ['نقش:new@x.com', 'accountant', 't'],
  ...invites.map(email => [`دعوت:${email}`, '2026-10-01', 't'])
]

const entry = (email: string) => [
  'id' + email,
  '2026-10-10T10:00:00Z',
  email,
  'نام',
  'create',
  'records',
  '',
  'x',
  ''
]

function setup(invites: string[], writers: string[] = []) {
  setSheetAllRows('b1', PERIOD_SETTINGS_SHEET, [HEADER, ...rows(invites)])
  setSheetAllRows('b1', ACTIVITY_LOG_SHEET, [ACTIVITY_LOG_HEADERS, ...writers.map(entry)])
}

beforeEach(() => {
  removed.keys.length = 0
  removed.fail = false
  user.email = 'boss@x.com'
  saveSettings({ ...getDefaultSettings(), spreadsheetId: 'b1' })
  setWorkspaceType('b1', 'building')
})

describe('memberStatus', () => {
  const none = new Set<string>()

  it('is «دعوت‌شده» while the invite is left and nothing shows the member joined', () => {
    expect(
      memberStatus('a@x.com', { invited: new Set(['a@x.com']), me: 'b@x.com', writers: none })
    ).toBe('invited')
  })

  it('is «فعال» without an invite row, for the signed-in user, or after a writer entry', () => {
    const invited = new Set(['a@x.com'])

    expect(memberStatus('a@x.com', { invited: none, me: '', writers: none })).toBe('active')
    expect(memberStatus('A@x.com', { invited, me: 'a@X.com', writers: none })).toBe('active')
    expect(memberStatus('a@x.com', { invited, me: 'b@x.com', writers: new Set(['a@x.com']) })).toBe(
      'active'
    )
  })

  it('reads the writers from the «کاربر» column of the activity log, skipping its header', () => {
    expect(
      activityWriters([ACTIVITY_LOG_HEADERS, entry('Acc@x.com'), entry('boss@x.com')])
    ).toEqual(new Set(['acc@x.com', 'boss@x.com']))
    expect(activityWriters([])).toEqual(new Set())
  })
})

describe('memberStatusReader', () => {
  it('turns an invited member active once the log shows a write by them', () => {
    setup(['acc@x.com', 'board@x.com', 'new@x.com'], ['acc@x.com'])

    const status = memberStatusReader('b1', 'boss@x.com')

    expect(status('acc@x.com')).toBe('active')
    expect(status('board@x.com')).toBe('invited')
    expect(status('new@x.com')).toBe('invited')
    expect(status('boss@x.com')).toBe('active')
  })

  it('makes the signed-in invited user active on their own device', () => {
    setup(['acc@x.com'])

    expect(memberStatusReader('b1', 'acc@x.com')('acc@x.com')).toBe('active')
  })
})

describe('claimOwnInvite', () => {
  it("removes the signed-in member's own invite row, once", async () => {
    setup(['acc@x.com'])
    user.email = 'Acc@x.com'

    expect(await claimOwnInvite('b1')).toBe(true)
    expect(removed.keys).toEqual([['دعوت:acc@x.com']])

    expect(await claimOwnInvite('b1')).toBe(false)
    expect(removed.keys).toHaveLength(1)
  })

  it('does nothing without an invite row, or for a Drive viewer whose write would fail', async () => {
    setup([])
    user.email = 'acc@x.com'
    expect(await claimOwnInvite('b1')).toBe(false)

    setup(['board@x.com'])
    user.email = 'board@x.com'
    expect(await claimOwnInvite('b1')).toBe(false)

    expect(removed.keys).toEqual([])
  })

  it('does nothing for a person who is not a member, or when signed out', async () => {
    setup(['ghost@x.com'])
    user.email = 'ghost@x.com'
    expect(await claimOwnInvite('b1')).toBe(false)

    user.email = ''
    expect(await claimOwnInvite('b1')).toBe(false)
  })

  it('tries again after a failed write', async () => {
    setup(['new@x.com'])
    user.email = 'new@x.com'
    removed.fail = true

    expect(await claimOwnInvite('b1')).toBe(false)

    removed.fail = false
    expect(await claimOwnInvite('b1')).toBe(true)
  })
})

describe('markMemberActive', () => {
  it("lets the manager clear a member's invite row", async () => {
    setup(['board@x.com'])

    expect(await markMemberActive('b1', 'Board@x.com')).toBeNull()
    expect(removed.keys).toEqual([['دعوت:board@x.com']])
  })

  it('refuses without the settings permission, and for an unknown member', async () => {
    setup(['board@x.com'])
    user.email = 'acc@x.com'
    expect(await markMemberActive('b1', 'board@x.com')).toBe('forbidden')

    user.email = 'boss@x.com'
    expect(await markMemberActive('b1', 'ghost@x.com')).toBe('unknown')
    expect(removed.keys).toEqual([])
  })
})
