import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const pull = vi.fn()
const hasData = vi.fn()

vi.mock('./sheetSyncPull', () => ({ pullRemoteSheets: (...args: unknown[]) => pull(...args) }))
vi.mock('./migrateLegacyMachineExpenseCategory', () => ({
  migrateLegacyMachineExpenseCategory: async () => undefined
}))
vi.mock('./migrateSubCategoryColumn', () => ({ migrateSubCategoryColumn: async () => undefined }))
vi.mock('./migrateWalletApplyColumn', () => ({
  migrateWalletColumns: async () => undefined
}))
vi.mock('./settings', () => ({ getSettings: () => ({ forms: [] }) }))
vi.mock('./sheetSyncOutbox', () => ({
  flushOutbox: async () => true,
  invalidateDerivedCaches: vi.fn(),
  isQuotaBlocked: () => false,
  refreshFailedCount: vi.fn()
}))
vi.mock('./spreadsheetStore', () => ({
  clearStore: vi.fn(),
  getStoreLastSyncedAt: () => null,
  hasStoreData: () => hasData(),
  hydrateStore: async () => undefined
}))

const { initializeSheetSync, stopSheetSync, SYNC_INTERVAL_MS } = await import(
  './sheetSyncLifecycle'
)

async function settle() {
  for (let i = 0; i < 5; i += 1) await Promise.resolve()
}

describe('sheet sync lifecycle', () => {
  beforeEach(() => {
    pull.mockReset().mockResolvedValue(undefined)
    hasData.mockReset()
  })

  afterEach(() => {
    stopSheetSync()
    vi.useRealTimers()
  })

  it('lets a cold start with a cached mirror download only what changed', async () => {
    hasData.mockReturnValue(true)

    await initializeSheetSync('sheet-1')
    await settle()

    expect(pull).toHaveBeenCalledWith(
      'sheet-1',
      expect.anything(),
      expect.objectContaining({ skipIfUnchanged: true, hadData: true })
    )
  })

  it('downloads everything on a device with no mirror yet', async () => {
    hasData.mockReturnValue(false)

    await initializeSheetSync('sheet-1')

    expect(pull).toHaveBeenCalledWith(
      'sheet-1',
      expect.anything(),
      expect.objectContaining({ hadData: false })
    )
  })

  it('checks for remote changes every 30 seconds', () => {
    expect(SYNC_INTERVAL_MS).toBe(30_000)
  })
})
