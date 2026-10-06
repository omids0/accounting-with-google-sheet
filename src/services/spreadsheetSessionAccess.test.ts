import { beforeEach, describe, expect, it, vi } from 'vitest'

import { clearInaccessibleSpreadsheet, getInaccessibleSpreadsheet } from './spreadsheetAccess'
import { resolveSpreadsheetSession } from './spreadsheetSetup'

const verifySpreadsheetExists = vi.fn<(id: string) => Promise<boolean>>()

const syncSpreadsheetsFromDrive = vi.fn()

const ACTIVE = { id: 'copied-by-hand', name: 'Copy of حسابداری · 1405', createdAt: '' }

const APP_MADE = { id: 'app-made', name: 'حسابداری · 1406', createdAt: '2026-01-01' }

vi.mock('./sheets', () => ({
  createSpreadsheet: vi.fn(),
  ensureManySheetsWithHeaders: vi.fn(),
  invalidateSpreadsheetCache: vi.fn(),
  markSheetsPrepared: vi.fn(),
  verifySpreadsheetExists: (id: string) => verifySpreadsheetExists(id)
}))

vi.mock('./spreadsheetDriveSync', () => ({
  syncSpreadsheetsFromDrive: () => syncSpreadsheetsFromDrive()
}))

vi.mock('./settings', () => ({
  getDefaultSettings: () => ({ forms: [], spreadsheets: [] }),
  getSettings: () => ({ forms: [], spreadsheetId: ACTIVE.id, spreadsheets: [ACTIVE] }),
  registerSpreadsheet: vi.fn()
}))

describe('resolveSpreadsheetSession when drive.file cannot reach the active sheet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearInaccessibleSpreadsheet()
  })

  it('records the sheet for the setup screen and offers the sheets the app can open', async () => {
    verifySpreadsheetExists.mockResolvedValue(false)
    syncSpreadsheetsFromDrive.mockResolvedValue([ACTIVE, APP_MADE])

    const session = await resolveSpreadsheetSession()

    expect(session).toEqual({ status: 'need_selection', options: [APP_MADE] })
    expect(getInaccessibleSpreadsheet()).toEqual(ACTIVE)
  })

  it('asks for a new sheet when the app can open none', async () => {
    verifySpreadsheetExists.mockResolvedValue(false)
    syncSpreadsheetsFromDrive.mockResolvedValue([ACTIVE])

    await expect(resolveSpreadsheetSession()).resolves.toEqual({ status: 'need_first_sheet' })
    expect(getInaccessibleSpreadsheet()?.id).toBe(ACTIVE.id)
  })

  it('clears the record once the sheet is reachable again', async () => {
    verifySpreadsheetExists.mockResolvedValue(false)
    syncSpreadsheetsFromDrive.mockResolvedValue([])
    await resolveSpreadsheetSession()

    verifySpreadsheetExists.mockResolvedValue(true)

    await expect(resolveSpreadsheetSession()).resolves.toEqual({
      status: 'ready',
      spreadsheetId: ACTIVE.id
    })
    expect(getInaccessibleSpreadsheet()).toBeNull()
  })
})
