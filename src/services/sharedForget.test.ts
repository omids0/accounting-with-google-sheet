import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getDefaultSettings, getSettings, saveSettings, setActiveSpreadsheet } from './settings'
import { clearSharedAccessLost, isSharedAccessLost, markSharedAccessLost } from './sharedAccessLost'
import { connectSharedAccount } from './sharedConnect'
import { forgetUnreachableShared } from './sharedForget'
import { ONE_SHARED_ACCOUNT_MESSAGE } from './sharedWorkspace'
import { hasSharedAccount, setWorkspaceType } from './workspace'

const mocks = vi.hoisted(() => ({
  switchActive: vi.fn(),
  moveSync: vi.fn(async () => undefined),
  /** The marker row the next sheet read returns. */
  typeRow: 'حساب مشترک'
}))

vi.mock('./spreadsheetSetup', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  switchActiveSpreadsheet: mocks.switchActive
}))
vi.mock('./spreadsheetSwitch', () => ({ moveSyncToSpreadsheet: mocks.moveSync }))
vi.mock('./sheetsRows', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  batchFetchSheetRangesFromApi: async () =>
    new Map([
      [
        'تنظیمات دوره',
        [
          ['کلید', 'مقدار', 'زمان ثبت'],
          ['نوع فضا', mocks.typeRow, 't']
        ]
      ]
    ])
}))
vi.mock('../stores/appStore', () => ({ bumpSpreadsheetKey: vi.fn() }))

const personal = { id: 'p1', name: 'حسابداری · شخصی', createdAt: '' }

const shared = { id: 's1', name: 'حسابداری · مشترک خانه', createdAt: '', kind: 'shared' as const }

beforeEach(() => {
  localStorage.clear()
  clearSharedAccessLost('s1')
  mocks.switchActive.mockReset()
  mocks.switchActive.mockImplementation(async (id: string) => {
    setActiveSpreadsheet(id)

    return id
  })
  mocks.moveSync.mockClear()
  mocks.typeRow = 'حساب مشترک'
  saveSettings({ ...getDefaultSettings(), spreadsheetId: 'p1', spreadsheets: [personal, shared] })
  setWorkspaceType('s1', 'shared')
})

describe('forgetUnreachableShared', () => {
  it('blocks a second account until the dead one is forgotten on this device, then allows it', async () => {
    markSharedAccessLost('s1')

    await expect(connectSharedAccount('s2', 'حسابداری · مشترک سفر')).rejects.toThrow(
      ONE_SHARED_ACCOUNT_MESSAGE
    )

    expect(await forgetUnreachableShared('s1')).toBe(true)
    expect(hasSharedAccount()).toBe(false)
    expect(isSharedAccessLost('s1')).toBe(false)
    expect(getSettings()?.spreadsheets?.map(entry => entry.id)).toEqual(['p1'])

    expect(await connectSharedAccount('s2', 'حسابداری · مشترک سفر')).toBe(true)
    expect(hasSharedAccount()).toBe(true)
    expect(getSettings()?.spreadsheets?.map(entry => entry.id)).toEqual(['p1', 's2'])
  })

  it('opens the personal sheet first when the dead account is the open one', async () => {
    setActiveSpreadsheet('s1')

    expect(await forgetUnreachableShared('s1')).toBe(true)
    expect(mocks.switchActive).toHaveBeenCalledWith('p1')
    expect(mocks.moveSync).toHaveBeenCalledWith('s1', 'p1')
    expect(getSettings()?.spreadsheetId).toBe('p1')
    expect(hasSharedAccount()).toBe(false)
  })

  it('does not touch the personal sheet when the dead account is not open', async () => {
    await forgetUnreachableShared('s1')

    expect(mocks.switchActive).not.toHaveBeenCalled()
  })

  it('forgets nothing when the account is open and there is no personal sheet to open', async () => {
    saveSettings({ ...getDefaultSettings(), spreadsheetId: 's1', spreadsheets: [shared] })

    expect(await forgetUnreachableShared('s1')).toBe(false)
    expect(hasSharedAccount()).toBe(true)
  })

  it('keeps the account registered when opening the personal sheet fails', async () => {
    setActiveSpreadsheet('s1')
    mocks.switchActive.mockRejectedValueOnce(new Error('offline'))

    await expect(forgetUnreachableShared('s1')).rejects.toThrow('offline')
    expect(hasSharedAccount()).toBe(true)
  })

  it('lets the same file be connected again while it is still registered', async () => {
    expect(await connectSharedAccount('s1')).toBe(true)
  })
})
