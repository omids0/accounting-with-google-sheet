import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  changeMemberRole,
  DRIVE_ACCESS,
  effectivePermission,
  isCustom,
  memberBlock,
  removeMember,
  setMemberOverrides,
  viewerCanWrite,
  withOverride
} from './buildingMembers'
import { parseMembers } from './buildingRoles'
import { getDefaultSettings, saveSettings } from './settings'
import { setSheetAllRows } from './spreadsheetStore'
import { setWorkspaceType } from './workspace'

const user = vi.hoisted(() => ({ email: 'boss@x.com' }))

const written = vi.hoisted(() => ({
  set: [] as [string, string][],
  removed: [] as string[][]
}))

vi.mock('./auth', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getUserEmail: () => user.email
}))

vi.mock('./periodSettings', () => ({
  setPeriodSetting: async (_id: string, key: string, value: string) => {
    written.set.push([key, value])
  },
  deletePeriodSettings: async (_id: string, keys: string[]) => {
    written.removed.push(keys)
  }
}))

const HEADER = ['کلید', 'مقدار', 'زمان ثبت']

function sheetRows(rows: string[][]) {
  setSheetAllRows('b1', 'تنظیمات دوره', [HEADER, ...rows])
}

const TWO_MANAGERS = [
  ['نقش:boss@x.com', 'manager', 't'],
  ['نقش:co@x.com', 'manager', 't'],
  ['نقش:acc@x.com', 'accountant', 't'],
  ['دسترسی:acc@x.com', '{"settings":true}', 't'],
  ['نقش:board@x.com', 'board', 't']
]

const ONE_MANAGER = TWO_MANAGERS.filter(row => row[0] !== 'نقش:co@x.com')

beforeEach(() => {
  written.set.length = 0
  written.removed.length = 0
  user.email = 'boss@x.com'
  saveSettings({ ...getDefaultSettings(), spreadsheetId: 'b1' })
  setWorkspaceType('b1', 'building')
  sheetRows(ONE_MANAGER)
})

describe('member overrides', () => {
  const board = parseMembers([['نقش:m@x.com', 'board', '']])[0]

  it('a changed switch is stored; a switch back to the role default is dropped', () => {
    expect(withOverride(board, 'record', true)).toEqual({ record: true })
    expect(withOverride({ ...board, overrides: { record: true } }, 'record', false)).toEqual({})
  })

  it('reads the effective permission from the override first', () => {
    const acc = { ...board, role: 'accountant' as const, overrides: { record: false } }

    expect(effectivePermission(acc, 'record')).toBe(false)
    expect(effectivePermission(acc, 'issue')).toBe(true)
    expect(isCustom(acc)).toBe(true)
    expect(isCustom(board)).toBe(false)
  })

  it('warns when a viewer gets a permission that writes, not for autoIssue alone', () => {
    expect(viewerCanWrite(board)).toBe(false)
    expect(viewerCanWrite({ ...board, overrides: { autoIssue: true } })).toBe(false)
    expect(viewerCanWrite({ ...board, overrides: { record: true } })).toBe(true)
    expect(viewerCanWrite({ ...board, role: 'accountant' })).toBe(false)
  })

  it('tells what the Drive share gives each role', () => {
    expect(DRIVE_ACCESS).toEqual({ manager: 'ویرایش', accountant: 'ویرایش', board: 'فقط مشاهده' })
  })
})

describe('memberBlock', () => {
  const list = parseMembers(TWO_MANAGERS)

  it('lets one of two managers be demoted or removed by the other', () => {
    expect(memberBlock(list, 'co@x.com', 'boss@x.com', 'change', 'board')).toBeNull()
    expect(memberBlock(list, 'co@x.com', 'boss@x.com', 'remove')).toBeNull()
  })

  it('refuses to take the last manager away', () => {
    const solo = parseMembers(ONE_MANAGER)

    expect(memberBlock(solo, 'boss@x.com', 'other@x.com', 'change', 'accountant')).toBe(
      'last-manager'
    )
    expect(memberBlock(solo, 'boss@x.com', 'other@x.com', 'remove')).toBe('last-manager')
  })

  it('refuses to let you change or remove yourself, even with another manager', () => {
    expect(memberBlock(list, 'boss@x.com', 'BOSS@x.com', 'change', 'accountant')).toBe('self')
    expect(memberBlock(list, 'boss@x.com', 'boss@x.com', 'remove')).toBe('self')
    expect(memberBlock(list, 'boss@x.com', 'boss@x.com', 'change')).toBe('self')
  })

  it('does not know a stranger', () => {
    expect(memberBlock(list, 'nobody@x.com', 'boss@x.com', 'remove')).toBe('unknown')
  })
})

describe('changeMemberRole', () => {
  it('writes the role and clears the member overrides', async () => {
    expect(await changeMemberRole('b1', 'acc@x.com', 'board')).toBeNull()

    expect(written.set).toEqual([
      ['نقش:acc@x.com', 'board'],
      ['دسترسی:acc@x.com', '{}']
    ])
  })

  it('writes no overrides row for a member without overrides', async () => {
    await changeMemberRole('b1', 'board@x.com', 'accountant')

    expect(written.set).toEqual([['نقش:board@x.com', 'accountant']])
  })

  it('writes nothing when the role stays', async () => {
    expect(await changeMemberRole('b1', 'acc@x.com', 'accountant')).toBeNull()
    expect(written.set).toEqual([])
  })

  it('keeps the last manager and does not touch yourself', async () => {
    expect(await changeMemberRole('b1', 'boss@x.com', 'board')).toBe('last-manager')

    sheetRows(TWO_MANAGERS)
    expect(await changeMemberRole('b1', 'boss@x.com', 'board')).toBe('self')
    expect(written.set).toEqual([])
  })

  it('refuses a user without the settings permission', async () => {
    user.email = 'acc@x.com'
    sheetRows(TWO_MANAGERS.filter(row => row[0] !== 'دسترسی:acc@x.com'))

    expect(await changeMemberRole('b1', 'board@x.com', 'accountant')).toBe('forbidden')
    expect(written.set).toEqual([])
  })

  it('lets an accountant holding the settings override manage members', async () => {
    user.email = 'acc@x.com'

    expect(await changeMemberRole('b1', 'board@x.com', 'accountant')).toBeNull()
  })
})

describe('setMemberOverrides and removeMember', () => {
  it('stores clean overrides as JSON; {} resets to the role', async () => {
    await setMemberOverrides('b1', 'board@x.com', { record: true, junk: 1 } as never)
    await setMemberOverrides('b1', 'board@x.com', {})

    expect(written.set).toEqual([
      ['دسترسی:board@x.com', '{"record":true}'],
      ['دسترسی:board@x.com', '{}']
    ])
  })

  it('does not let you edit your own switches', async () => {
    sheetRows(TWO_MANAGERS)

    expect(await setMemberOverrides('b1', 'boss@x.com', { settings: false })).toBe('self')
    expect(written.set).toEqual([])
  })

  it('drops the role, overrides and invite rows of a removed member', async () => {
    expect(await removeMember('b1', 'Acc@x.com')).toBeNull()

    expect(written.removed).toEqual([['نقش:acc@x.com', 'دسترسی:acc@x.com', 'دعوت:acc@x.com']])
  })

  it('keeps the last manager and yourself', async () => {
    expect(await removeMember('b1', 'boss@x.com')).toBe('last-manager')

    sheetRows(TWO_MANAGERS)
    expect(await removeMember('b1', 'boss@x.com')).toBe('self')
    expect(written.removed).toEqual([])
  })
})
