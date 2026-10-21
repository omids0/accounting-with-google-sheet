import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BUILDING_SHEET_SPECS } from './moduleSheetSpecs'
import { refreshSpreadsheetContents } from './spreadsheetPrepare'

const mocks = vi.hoisted(() => ({
  type: 'personal' as 'personal' | 'building',
  ensure: vi.fn(),
  categories: vi.fn()
}))

vi.mock('./workspace', () => ({
  hasWorkspaceType: () => true,
  syncWorkspaceTypeFromSheet: async () => mocks.type
}))
vi.mock('./sheetsEnsure', () => ({
  ensureManySheetsWithHeaders: (...args: unknown[]) => mocks.ensure(...args)
}))
vi.mock('./categories', () => ({
  syncCategoriesFromSheet: (...args: unknown[]) => mocks.categories(...args)
}))
vi.mock('./migrateLegacyMachineExpenseCategory', () => ({
  migrateLegacyMachineExpenseCategory: vi.fn()
}))
vi.mock('./migrateSubCategoryColumn', () => ({ migrateSubCategoryColumn: vi.fn() }))
vi.mock('./migrateWalletApplyColumn', () => ({ migrateWalletColumns: vi.fn() }))
vi.mock('./periodSettings', () => ({ ensureMembershipDate: vi.fn() }))

describe('refreshSpreadsheetContents', () => {
  beforeEach(() => {
    mocks.ensure.mockReset().mockResolvedValue(undefined)
    mocks.categories.mockReset()
  })

  it('creates no building tab in a personal spreadsheet', async () => {
    mocks.type = 'personal'
    await refreshSpreadsheetContents('personal-1')

    expect(mocks.ensure).not.toHaveBeenCalled()
    expect(mocks.categories).toHaveBeenCalledWith('personal-1')
  })

  it('gives a building first met on this device its tabs once the type is known', async () => {
    mocks.type = 'building'
    await refreshSpreadsheetContents('building-1')

    expect(mocks.ensure).toHaveBeenCalledWith('building-1', BUILDING_SHEET_SPECS)
  })

  it('does not fail the activation when the tabs cannot be created right now', async () => {
    mocks.type = 'building'
    mocks.ensure.mockRejectedValue(new Error('offline'))

    await expect(refreshSpreadsheetContents('building-1')).resolves.toBeUndefined()
    expect(mocks.categories).toHaveBeenCalled()
  })
})
