import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as DriveModule from './drive'

const io = vi.hoisted(() => ({
  access: vi.fn(),
  rows: vi.fn(),
  ensure: vi.fn(),
  prepare: vi.fn()
}))

vi.mock('./drive', async importOriginal => ({
  ...(await importOriginal<typeof DriveModule>()),
  getDriveFileAccess: (id: string) => io.access(id)
}))
vi.mock('./sheetsRows', () => ({
  batchFetchSheetRangesFromApi: (id: string) => io.rows(id)
}))
vi.mock('./sheets', () => ({
  createSpreadsheet: vi.fn(),
  ensureManySheetsWithHeaders: (...args: unknown[]) => io.ensure(...args),
  invalidateSpreadsheetCache: vi.fn(),
  markSheetsPrepared: vi.fn(),
  verifySpreadsheetExists: vi.fn(async () => true),
  fetchSheetRows: vi.fn(async () => [])
}))
vi.mock('./spreadsheetDriveSync', () => ({ syncSpreadsheetsFromDrive: vi.fn(async () => []) }))
vi.mock('./spreadsheetPrepare', () => ({
  prepareSpreadsheetContents: (...args: unknown[]) => io.prepare(...args),
  refreshSpreadsheetContents: vi.fn()
}))

import { FOREIGN_READ_ONLY_SHEET_MESSAGE, resetForeignSheetGuard } from './foreignSheetGuard'
import { getDefaultSettings, getSettings, saveSettings } from './settings'
import { activateSpreadsheet } from './spreadsheetSetup'
import { WORKSPACE_TYPE_ROW } from './workspace'

const READ_ONLY_FOREIGN = { ownedByMe: false, capabilities: { canEdit: false } }

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  resetForeignSheetGuard()
  saveSettings({
    ...getDefaultSettings(),
    spreadsheetId: 'mine',
    spreadsheets: [{ id: 'mine', name: 'حسابداری · من', createdAt: '' }]
  })
})

describe('activateSpreadsheet with a sheet someone else owns', () => {
  it('refuses a child sheet from the picker: not registered, not active, nothing written', async () => {
    io.access.mockResolvedValue(READ_ONLY_FOREIGN)
    io.rows.mockResolvedValue(new Map([['تنظیمات دوره', [['کلید', 'مقدار']]]]))

    await expect(activateSpreadsheet('kid', 'mine', 'حسابداری سارا')).rejects.toThrow(
      FOREIGN_READ_ONLY_SHEET_MESSAGE
    )

    expect(getSettings()?.spreadsheetId).toBe('mine')
    expect(getSettings()?.spreadsheets?.map(sheet => sheet.id)).toEqual(['mine'])
    expect(io.ensure).not.toHaveBeenCalled()
    expect(io.prepare).not.toHaveBeenCalled()
  })

  it('still opens a shared account the user may only view', async () => {
    io.access.mockResolvedValue(READ_ONLY_FOREIGN)
    io.rows.mockResolvedValue(
      new Map([
        [
          'تنظیمات دوره',
          [
            ['کلید', 'مقدار'],
            [WORKSPACE_TYPE_ROW, 'حساب مشترک']
          ]
        ]
      ])
    )

    await expect(activateSpreadsheet('shared-1', 'mine', 'حسابداری · مشترک')).resolves.toBe(
      'shared-1'
    )
    expect(getSettings()?.spreadsheetId).toBe('shared-1')
  })
})
