import { beforeEach, describe, expect, it, vi } from 'vitest'

import { applyWalletChanges, recordLedgerContext, walletEffectOf } from './recordWallet'
import type * as SettingsModule from './settings'
import { updateRecord } from './sheets'
import { fetchVehicleHistory } from './vehicleHistory'
import { fetchVehiclePeriodicServices } from './vehiclePeriodicServices'
import { fetchVehicleTransactions, sumVehicleTransactionAmounts } from './vehicleTransactions'
import { deleteVehicleDetailItem } from '../components/vehicles/vehicleDetailMutations'
import { testSettings } from '../test/dashboardFixtures'
import {
  balance,
  expectBalanceAndLedgerAgree,
  expenseById,
  expenseForm,
  firstService,
  ID,
  seed,
  service,
  START
} from '../test/vehicleServiceFixtures'

vi.mock('./sheetSync', () => ({ enqueueSheetWrite: vi.fn(), queueOutboxWrite: vi.fn() }))
vi.mock('./settings', async importOriginal => ({
  ...(await importOriginal<typeof SettingsModule>()),
  getSettings: () => testSettings,
  updateFormCategories: vi.fn()
}))
vi.mock('../utils/toast', () => ({ showError: vi.fn(), showInfo: vi.fn(), showSuccess: vi.fn() }))

describe('«ثبت انجام سرویس» again: history, delete and edit', () => {
  beforeEach(() => {
    seed()
  })

  it('gives each cycle its own date, history line and expense; the row follows the latest', async () => {
    const first = await firstService(1_450_000)
    const second = await service(2_100_000, first, '2026-10-25')
    const [row] = await fetchVehiclePeriodicServices(ID, 'v1')

    expect((await expenseById(first))?.values.date).toBe('2026-10-01')
    expect((await expenseById(second))?.values.date).toBe('2026-10-25')
    expect(row.expenseRecordId).toBe(second)
    expect(row.currentMileage).toBe(1000)
    expect(row.nextKm).toBe(6000)

    const third = await service(2_100_000, second, '2026-10-26')

    expect(
      (await fetchVehicleHistory(ID, 'v1')).map(line => [line.date, line.expenseRecordId])
    ).toEqual([
      ['2026-10-26', third],
      ['2026-10-25', second],
      ['2026-10-01', first]
    ])
  })

  it('deleting the new cycle with its expense keeps the earlier cycle, its line and its money', async () => {
    const first = await firstService(1_450_000)
    const second = await service(2_100_000, first)
    const newest = (await fetchVehicleHistory(ID, 'v1')).find(
      line => line.expenseRecordId === second
    )!

    await deleteVehicleDetailItem({
      spreadsheetId: ID,
      target: { kind: 'history', item: newest },
      deleteLinkedExpense: true
    })

    expect(await expenseById(second)).toBeUndefined()
    expect(await expenseById(first)).toBeDefined()
    expect((await fetchVehicleHistory(ID, 'v1')).map(line => line.expenseRecordId)).toEqual([first])
    expect(await balance()).toBe(START - 1_450_000)
    await expectBalanceAndLedgerAgree()
  })

  it('editing one cycle on the records page changes only that cycle', async () => {
    const first = await firstService(1_450_000)
    const second = await service(2_100_000, first)
    const old = (await expenseById(first))!
    const edited = { ...old.values, amount: 1_000_000 }

    await updateRecord(ID, expenseForm, old.rowNumber, old.id, old.createdAt, edited, old.sheetName)
    await applyWalletChanges(
      ID,
      walletEffectOf('expense', old.values),
      walletEffectOf('expense', edited),
      recordLedgerContext(edited, 'ویرایش', old.id)
    )

    expect(Number((await expenseById(first))?.values.amount)).toBe(1_000_000)
    expect(Number((await expenseById(second))?.values.amount)).toBe(2_100_000)
    expect(await balance()).toBe(START - 1_000_000 - 2_100_000)
    await expectBalanceAndLedgerAgree()
  })

  it('lists every cycle once in the car transactions', async () => {
    const first = await firstService(1_450_000)
    const second = await service(2_100_000, first, '2026-10-25')

    await service(2_300_000, second, '2026-10-26')

    const items = await fetchVehicleTransactions(ID, 'v1')

    expect(items.map(item => item.amount)).toEqual([2_300_000, 2_100_000, 1_450_000])
    expect(sumVehicleTransactionAmounts(items)).toBe(5_850_000)
  })
})
