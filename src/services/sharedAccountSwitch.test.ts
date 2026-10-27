import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getDefaultSettings, getSettings, saveSettings } from './settings'
import {
  hideSharedAccount,
  isSharedOwner,
  knownSharedMembers,
  loadSharedMembers,
  isSharedAccountHidden,
  registeredSharedAccount,
  revokeAllSharedAccess,
  showSharedAccount,
  visibleSharedAccount
} from './sharedAccountSwitch'
import { setSheetAllRows } from './spreadsheetStore'
import { setWorkspaceType } from './workspace'

const user = vi.hoisted(() => ({ email: 'owner@x.com' }))

const calls = vi.hoisted(() => ({
  unshared: [] as string[],
  fetched: 0,
  /** What Drive lists besides the owner. */
  drive: [] as string[]
}))

const remote = vi.hoisted(() => ({ rows: [] as string[][] }))

vi.mock('./auth', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getUserEmail: () => user.email
}))

vi.mock('./driveShare', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  listSharedEmails: async () => [...calls.drive],
  unshareFile: async (_id: string, email: string) => {
    calls.unshared.push(email)
  }
}))

vi.mock('./sheetsRows', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  batchFetchSheetRangesFromApi: async (_id: string, names: string[]) => {
    calls.fetched += 1

    return new Map(names.map(name => [name, remote.rows]))
  }
}))

const HEADER = ['کلید', 'مقدار', 'زمان ثبت']

const OWNER = ['نقش:owner@x.com', 'owner', 't']

const PARTNER = ['نقش:partner@x.com', 'partner', 't']

const VIEWER = ['نقش:viewer@x.com', 'viewer', 't']

beforeEach(() => {
  localStorage.clear()
  calls.unshared.length = 0
  calls.fetched = 0
  calls.drive = ['partner@x.com', 'viewer@x.com']
  user.email = 'owner@x.com'
  saveSettings({
    ...getDefaultSettings(),
    spreadsheetId: 's1',
    spreadsheets: [
      { id: 'p1', name: 'حسابداری', createdAt: 't' },
      { id: 's1', name: 'حسابداری · مشترک خانه', createdAt: 't', kind: 'shared' }
    ]
  })
  setWorkspaceType('s1', 'shared')
  setSheetAllRows('s1', 'تنظیمات دوره', [HEADER, OWNER, PARTNER, VIEWER])
})

describe('hiding the shared account on this device', () => {
  it('shows the registered shared account until it is hidden', () => {
    expect(visibleSharedAccount()?.id).toBe('s1')
    expect(isSharedAccountHidden('s1')).toBe(false)
  })

  it('hides it from the visible account but keeps the registry entry', () => {
    hideSharedAccount('s1')

    expect(isSharedAccountHidden('s1')).toBe(true)
    expect(visibleSharedAccount()).toBeNull()
    expect(registeredSharedAccount()?.id).toBe('s1')
    expect(getSettings()?.spreadsheets?.some(entry => entry.id === 's1')).toBe(true)
  })

  it('shows it again', () => {
    hideSharedAccount('s1')
    showSharedAccount('s1')

    expect(isSharedAccountHidden('s1')).toBe(false)
    expect(visibleSharedAccount()?.id).toBe('s1')
  })

  it('has nothing to show when no shared account is registered', () => {
    saveSettings({
      ...getDefaultSettings(),
      spreadsheets: [{ id: 'p1', name: 'x', createdAt: 't' }]
    })

    expect(visibleSharedAccount()).toBeNull()
    expect(registeredSharedAccount()).toBeNull()
  })
})

describe('revokeAllSharedAccess', () => {
  it('removes every share except the owner and then hides the account', async () => {
    await revokeAllSharedAccess('s1')

    expect(calls.unshared.sort()).toEqual(['partner@x.com', 'viewer@x.com'])
    expect(isSharedAccountHidden('s1')).toBe(true)
  })

  it('also unshares a Drive share that has no role row yet, and never the owner', async () => {
    calls.drive = ['partner@x.com', 'viewer@x.com', 'invited@x.com', 'owner@x.com']

    await revokeAllSharedAccess('s1')

    expect(calls.unshared.sort()).toEqual(['invited@x.com', 'partner@x.com', 'viewer@x.com'])
    expect(isSharedAccountHidden('s1')).toBe(true)
  })

  it('does not hide the account when one unshare fails', async () => {
    const drive = await import('./driveShare')

    vi.spyOn(drive, 'unshareFile').mockRejectedValueOnce(new Error('403'))

    await expect(revokeAllSharedAccess('s1')).rejects.toThrow('403')
    expect(isSharedAccountHidden('s1')).toBe(false)
  })

  it('refuses a partner who was given the members permission', async () => {
    user.email = 'partner@x.com'
    setSheetAllRows('s1', 'تنظیمات دوره', [
      HEADER,
      OWNER,
      PARTNER,
      ['دسترسی:partner@x.com', '{"members":true}', 't']
    ])

    expect(isSharedOwner(await loadSharedMembers('s1'))).toBe(false)
    await expect(revokeAllSharedAccess('s1')).rejects.toThrow()
    expect(calls.unshared).toEqual([])
  })

  it('refuses anyone but the owner and changes nothing', async () => {
    user.email = 'partner@x.com'

    await expect(revokeAllSharedAccess('s1')).rejects.toThrow()
    expect(calls.unshared).toEqual([])
    expect(isSharedAccountHidden('s1')).toBe(false)
  })

  it('stays visible when Drive refuses a share', async () => {
    const drive = await import('./driveShare')

    vi.spyOn(drive, 'unshareFile').mockRejectedValueOnce(new Error('offline'))

    await expect(revokeAllSharedAccess('s1')).rejects.toThrow('offline')
    expect(isSharedAccountHidden('s1')).toBe(false)
  })
})

describe('a shared account that is not the open spreadsheet', () => {
  beforeEach(() => {
    saveSettings({
      ...getDefaultSettings(),
      spreadsheetId: 'p1',
      spreadsheets: [
        { id: 'p1', name: 'حسابداری', createdAt: 't' },
        { id: 's2', name: 'حسابداری · مشترک دیگر', createdAt: 't', kind: 'shared' }
      ]
    })
    setWorkspaceType('s2', 'shared')
    remote.rows = [HEADER, OWNER, PARTNER]
  })

  it('knows nothing until it reads the members from Sheets once', async () => {
    expect(knownSharedMembers('s2')).toBeNull()

    const list = await loadSharedMembers('s2')

    expect(list.map(member => member.email)).toEqual(['owner@x.com', 'partner@x.com'])
    expect(isSharedOwner(list)).toBe(true)
    expect(knownSharedMembers('s2')).toEqual(list)

    await loadSharedMembers('s2')
    expect(calls.fetched).toBe(1)
  })

  it('lets the owner switch it off from the personal workspace', async () => {
    remote.rows = [HEADER, OWNER, PARTNER, ['نقش:late@x.com', 'viewer', 't']]

    calls.drive = ['partner@x.com']

    await revokeAllSharedAccess('s2')

    expect(calls.unshared.sort()).toEqual(['late@x.com', 'partner@x.com'])
    expect(isSharedAccountHidden('s2')).toBe(true)
  })

  it('does not treat a partner as the owner', async () => {
    user.email = 'partner@x.com'

    expect(isSharedOwner(await loadSharedMembers('s2'))).toBe(false)
  })
})
