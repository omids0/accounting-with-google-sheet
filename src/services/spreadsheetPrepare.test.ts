import { beforeEach, describe, expect, it, vi } from 'vitest'

import { migrateCheckDirectionColumn } from './migrateCheckDirectionColumn'
import { migrateLegacyMachineExpenseCategory } from './migrateLegacyMachineExpenseCategory'
import { migrateSubCategoryColumn } from './migrateSubCategoryColumn'
import { migrateWalletColumns } from './migrateWalletApplyColumn'
import { BUILDING_SHEET_SPECS, SHARED_SHEET_SPECS } from './moduleSheetSpecs'
import { ensureMembershipDate } from './periodSettings'
import {
  prepareSpreadsheetContents,
  refreshSpreadsheetContents,
  runBackgroundMigrations
} from './spreadsheetPrepare'

const mocks = vi.hoisted(() => ({
  type: 'personal' as 'personal' | 'building' | 'shared',
  ensure: vi.fn(),
  categories: vi.fn()
}))

vi.mock('./workspace', () => ({
  getWorkspaceType: () => mocks.type,
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
  migrateLegacyMachineExpenseCategory: vi.fn(async () => ({ migratedRecords: 0 }))
}))
vi.mock('./migrateCheckDirectionColumn', () => ({
  migrateCheckDirectionColumn: vi.fn(async () => undefined)
}))
vi.mock('./migrateSubCategoryColumn', () => ({
  migrateSubCategoryColumn: vi.fn(async () => undefined)
}))
vi.mock('./migrateWalletApplyColumn', () => ({
  migrateWalletColumns: vi.fn(async () => undefined)
}))
vi.mock('./periodSettings', () => ({ ensureMembershipDate: vi.fn(async () => '') }))

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

  it('gives a shared account its own tabs, never the building or personal ones', async () => {
    mocks.type = 'shared'
    await refreshSpreadsheetContents('shared-1')

    expect(mocks.ensure).toHaveBeenCalledTimes(1)
    expect(mocks.ensure).toHaveBeenCalledWith('shared-1', SHARED_SHEET_SPECS)
  })

  it('does not fail the activation when the tabs cannot be created right now', async () => {
    mocks.type = 'building'
    mocks.ensure.mockRejectedValue(new Error('offline'))

    await expect(refreshSpreadsheetContents('building-1')).resolves.toBeUndefined()
    expect(mocks.categories).toHaveBeenCalled()
  })
})

describe('the personal one-off migrations', () => {
  beforeEach(() => {
    vi.mocked(migrateLegacyMachineExpenseCategory).mockClear()
    vi.mocked(migrateSubCategoryColumn).mockClear()
    vi.mocked(migrateCheckDirectionColumn).mockClear()
    vi.mocked(migrateWalletColumns).mockClear()
    vi.mocked(ensureMembershipDate).mockClear()
  })

  it('run for a personal spreadsheet', async () => {
    mocks.type = 'personal'
    await prepareSpreadsheetContents('personal-1')

    expect(migrateLegacyMachineExpenseCategory).toHaveBeenCalledWith('personal-1')
    expect(migrateSubCategoryColumn).toHaveBeenCalledWith('personal-1')
    expect(migrateCheckDirectionColumn).toHaveBeenCalledWith('personal-1')
    expect(migrateWalletColumns).toHaveBeenCalledWith('personal-1')
    expect(ensureMembershipDate).toHaveBeenCalledWith('personal-1')
  })

  it('are skipped for a building, which only gets its membership date', async () => {
    mocks.type = 'building'
    await prepareSpreadsheetContents('building-1')

    expect(migrateLegacyMachineExpenseCategory).not.toHaveBeenCalled()
    expect(migrateSubCategoryColumn).not.toHaveBeenCalled()
    expect(migrateCheckDirectionColumn).not.toHaveBeenCalled()
    expect(migrateWalletColumns).not.toHaveBeenCalled()
    expect(ensureMembershipDate).toHaveBeenCalledWith('building-1')
  })

  it('do not run in the background for a building either', () => {
    mocks.type = 'building'
    runBackgroundMigrations('building-1')

    expect(migrateLegacyMachineExpenseCategory).not.toHaveBeenCalled()
    expect(migrateSubCategoryColumn).not.toHaveBeenCalled()
  })
})

describe('the personal one-off migrations in a shared account', () => {
  beforeEach(() => {
    vi.mocked(migrateLegacyMachineExpenseCategory).mockClear()
    vi.mocked(migrateSubCategoryColumn).mockClear()
    vi.mocked(migrateCheckDirectionColumn).mockClear()
    vi.mocked(migrateWalletColumns).mockClear()
    vi.mocked(ensureMembershipDate).mockClear()
  })

  it('are skipped, which only gets its membership date', async () => {
    mocks.type = 'shared'
    await prepareSpreadsheetContents('shared-1')

    expect(migrateLegacyMachineExpenseCategory).not.toHaveBeenCalled()
    expect(migrateSubCategoryColumn).not.toHaveBeenCalled()
    expect(migrateCheckDirectionColumn).not.toHaveBeenCalled()
    expect(migrateWalletColumns).not.toHaveBeenCalled()
    expect(ensureMembershipDate).toHaveBeenCalledWith('shared-1')
  })

  it('do not run in the background either', () => {
    mocks.type = 'shared'
    runBackgroundMigrations('shared-1')

    expect(migrateLegacyMachineExpenseCategory).not.toHaveBeenCalled()
    expect(migrateSubCategoryColumn).not.toHaveBeenCalled()
  })
})
