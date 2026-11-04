import { beforeEach, describe, expect, it, vi } from 'vitest'

const io = vi.hoisted(() => ({
  rows: [] as string[][],
  drive: [] as string[] | null,
  email: 'teen@x.com',
  shared: [] as { email: string; role: string; message?: string }[],
  settings: [] as string[][]
}))

const markerFailures = vi.hoisted(() => ({ count: 0, calls: 0 }))

vi.mock('./auth', () => ({ getUserEmail: () => io.email }))
vi.mock('./spreadsheetStore', () => ({ getSheetDataRows: () => io.rows }))
vi.mock('./periodSettings', () => ({
  setPeriodSetting: vi.fn(async (_id: string, key: string, value: string) => {
    markerFailures.calls += 1
    if (markerFailures.count > 0) {
      markerFailures.count -= 1
      throw new Error('write failed')
    }
    io.settings.push([key, value])
  })
}))
vi.mock('./driveShare', () => ({
  shareErrorMessage: (_err: unknown, fallback: string) => fallback,
  listSharedEmails: vi.fn(async () => {
    if (!io.drive) throw new Error('403')

    return io.drive
  }),
  shareFile: vi.fn(async (_id: string, email: string, role: string, message?: string) => {
    io.shared.push({ email, role, message })
  })
}))

import * as parentAccess from './parentAccess'
import {
  activeParents,
  grantParentAccess,
  listParents,
  NOT_PERSONAL_PARENT_MESSAGE,
  parentEmailsFromRows,
  PARENT_ROW_PREFIX
} from './parentAccess'
import {
  buildParentInviteLink,
  buildParentInviteText,
  parseParentInviteParam
} from './parentInvite'
import { setItem, STORAGE_KEYS } from './storage'
import { setWorkspaceType } from './workspace'

beforeEach(() => {
  localStorage.clear()
  io.rows = []
  io.drive = []
  io.shared = []
  io.settings = []
  markerFailures.count = 0
  markerFailures.calls = 0
  setItem(STORAGE_KEYS.SETTINGS, {
    spreadsheetId: 'P1',
    spreadsheets: [{ id: 'P1', name: 'من', createdAt: '' }],
    forms: []
  })
})

describe('parent marker rows', () => {
  it('reads «والد:<email>» rows, lower-cased, once each, ignoring other rows', () => {
    expect(
      parentEmailsFromRows([
        ['نقش:a@x.com', 'مدیر'],
        [`${PARENT_ROW_PREFIX}Mom@X.com`, '2026-11-03'],
        [`${PARENT_ROW_PREFIX}mom@x.com`, '2026-11-04'],
        [`${PARENT_ROW_PREFIX}`, 'x'],
        [`${PARENT_ROW_PREFIX}dad@x.com`, '']
      ])
    ).toEqual([
      { email: 'mom@x.com', since: '2026-11-03' },
      { email: 'dad@x.com', since: null }
    ])
  })

  it('lists parents cross-checked with Drive', async () => {
    io.rows = [
      [`${PARENT_ROW_PREFIX}mom@x.com`, '2026-11-03'],
      [`${PARENT_ROW_PREFIX}dad@x.com`, '2026-11-03']
    ]
    io.drive = ['mom@x.com']

    const list = await listParents('P1')

    expect(list.map(parent => [parent.email, parent.status])).toEqual([
      ['mom@x.com', 'active'],
      ['dad@x.com', 'revoked']
    ])
    expect(activeParents(list).map(parent => parent.email)).toEqual(['mom@x.com'])
  })

  it('marks every parent unverified when Drive cannot be asked', async () => {
    io.rows = [[`${PARENT_ROW_PREFIX}mom@x.com`, '2026-11-03']]
    io.drive = null

    const list = await listParents('P1')

    expect(list[0].status).toBe('unverified')
    expect(activeParents(list)).toHaveLength(1)
  })

  it('lists a Drive reader that has no marker row (a lost write) as active, since null', async () => {
    io.rows = [[`${PARENT_ROW_PREFIX}mom@x.com`, '2026-11-03']]
    io.drive = ['mom@x.com', 'uncle@x.com', 'uncle@x.com']

    const list = await listParents('P1')

    expect(list.map(parent => [parent.email, parent.status, parent.since])).toEqual([
      ['mom@x.com', 'active', '2026-11-03'],
      ['uncle@x.com', 'active', null]
    ])
  })

  it('lists a reader with no marker row at all, and nothing extra when Drive cannot be asked', async () => {
    io.drive = ['uncle@x.com']
    expect((await listParents('P1')).map(parent => parent.email)).toEqual(['uncle@x.com'])

    io.drive = null
    expect(await listParents('P1')).toEqual([])
  })

  it('exposes no function that removes a parent', () => {
    expect(
      Object.keys(parentAccess).filter(name => /remove|revoke|delete|unshare/i.test(name))
    ).toEqual([])
  })
})

describe('grantParentAccess', () => {
  it('shares as reader with a Persian message, then writes the marker row', async () => {
    expect(await grantParentAccess(' Mom@X.com ', { childName: 'سارا' })).toBe('granted')

    expect(io.shared).toHaveLength(1)
    expect(io.shared[0]).toMatchObject({ email: 'mom@x.com', role: 'reader' })
    expect(io.shared[0].message).toContain('سارا')
    expect(io.shared[0].message).toContain('باز کردن شیت با گوگل')
    expect(io.settings).toEqual([[`${PARENT_ROW_PREFIX}mom@x.com`, expect.any(String)]])
  })

  it('retries a failed marker write and still reports granted when it keeps failing', async () => {
    vi.useFakeTimers()
    markerFailures.count = 99

    const pending = grantParentAccess('mom@x.com')

    await vi.advanceTimersByTimeAsync(5000)
    expect(await pending).toBe('granted')
    expect(io.shared).toHaveLength(1)
    expect(markerFailures.calls).toBe(3)

    // the share is real: Drive lists the reader even though the row was lost
    io.drive = ['mom@x.com']
    expect((await listParents('P1')).map(parent => parent.email)).toEqual(['mom@x.com'])
    vi.useRealTimers()
  })

  it('writes the marker on the second try after one failure', async () => {
    vi.useFakeTimers()
    markerFailures.count = 1

    const pending = grantParentAccess('mom@x.com')

    await vi.advanceTimersByTimeAsync(5000)
    expect(await pending).toBe('granted')
    expect(io.settings).toEqual([[`${PARENT_ROW_PREFIX}mom@x.com`, expect.any(String)]])
    vi.useRealTimers()
  })

  it('rejects a bad e-mail and the own e-mail without sharing', async () => {
    expect(await grantParentAccess('nope')).toBe('invalid')
    expect(await grantParentAccess('۱۲۳@gmail.com')).toBe('invalid')
    expect(await grantParentAccess('Teen@x.com')).toBe('self')
    expect(io.shared).toEqual([])
    expect(io.settings).toEqual([])
  })

  it('does not share again with a parent who already has access', async () => {
    io.rows = [[`${PARENT_ROW_PREFIX}mom@x.com`, '2026-11-03']]
    io.drive = ['mom@x.com']

    expect(await grantParentAccess('mom@x.com')).toBe('exists')
    expect(io.shared).toEqual([])
  })

  it('shares again with a parent whose access was removed in Drive', async () => {
    io.rows = [[`${PARENT_ROW_PREFIX}mom@x.com`, '2026-11-03']]

    expect(await grantParentAccess('mom@x.com')).toBe('granted')
  })

  it('only works in a personal workspace', async () => {
    setWorkspaceType('P1', 'building')

    await expect(grantParentAccess('mom@x.com')).rejects.toThrow(NOT_PERSONAL_PARENT_MESSAGE)
    expect(io.shared).toEqual([])
  })
})

describe('parent invite', () => {
  it('builds the link with the parent e-mail and parses it back', () => {
    const link = buildParentInviteLink('https://app.example/acc/', ' Mom@X.com ')

    expect(link).toBe('https://app.example/acc/?parent=mom%40x.com')
    expect(parseParentInviteParam(link.slice(link.indexOf('?')))).toBe('mom@x.com')
    expect(parseParentInviteParam('?parent=bad')).toBeNull()
    expect(parseParentInviteParam('')).toBeNull()
    expect(buildParentInviteLink('', 'mom@x.com')).toBe('')
  })

  it('carries the e-mail and the link in the text', () => {
    const text = buildParentInviteText('mom@x.com', 'https://app.example/acc/', {
      downloadUrl: 'https://app.example/apk'
    })

    expect(text).toContain('mom@x.com')
    expect(text).toContain('https://app.example/acc/?parent=mom%40x.com')
    expect(text).toContain('https://app.example/apk')
    expect(text).toContain('والدین من')
    expect(text).toContain('باز کردن شیت با گوگل')
    expect(text).toContain('فرزندان من')
    expect(buildParentInviteText('mom@x.com', '')).not.toContain('http')
  })
})
