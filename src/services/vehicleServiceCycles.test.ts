import { beforeEach, describe, expect, it, vi } from 'vitest'

import { deleteLinkedExpenseRecord } from './paymentTransactions'
import { applyWalletChanges, recordLedgerContext, walletEffectOf } from './recordWallet'
import type * as SettingsModule from './settings'
import { updateRecord } from './sheets'
import { handleExpenseRecordDeleted } from './vehicleExpenseActions'
import { fetchVehicleHistory } from './vehicleHistory'
import { fetchVehiclePeriodicServices } from './vehiclePeriodicServices'
import { fetchVehicleTransactions, sumVehicleTransactionAmounts } from './vehicleTransactions'
import { WALLET_ACCOUNT_FIELD_ID } from '../components/form/fieldUtils'
import { deleteVehicleDetailItem } from '../components/vehicles/vehicleDetailMutations'
import { testSettings } from '../test/dashboardFixtures'
import {
  balance,
  expectBalanceAndLedgerAgree,
  expenseById,
  expenseRecords,
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

describe('«ثبت انجام سرویس» after a cycle was deleted', () => {
  beforeEach(() => {
    seed()
  })

  async function deleteHistoryLine(expenseId: string) {
    const line = (await fetchVehicleHistory(ID, 'v1')).find(
      item => item.expenseRecordId === expenseId
    )!

    await deleteVehicleDetailItem({
      spreadsheetId: ID,
      target: { kind: 'history', item: line },
      deleteLinkedExpense: true
    })
  }

  async function linkOf(): Promise<string> {
    return (await fetchVehiclePeriodicServices(ID, 'v1'))[0].expenseRecordId
  }

  it('re-points the service to the previous cycle, and the next redo is paid from its account', async () => {
    const first = await firstService(1_450_000)
    const second = await service(2_100_000, first, '2026-10-25')

    await deleteHistoryLine(second)

    const [row] = await fetchVehiclePeriodicServices(ID, 'v1')

    expect(row.expenseRecordId).toBe(first)
    expect(row.amount).toBe(1_450_000)
    expect(await balance()).toBe(START - 1_450_000)

    const third = await service(600_000, row.expenseRecordId, '2026-10-30')

    expect((await expenseById(third))?.values[WALLET_ACCOUNT_FIELD_ID]).toBe('wallet-1')
    expect(await balance()).toBe(START - 1_450_000 - 600_000)
    await expectBalanceAndLedgerAgree()
  })

  it('clears the link when the only cycle is deleted; the next cycle then has no account', async () => {
    const first = await firstService(1_450_000)

    await deleteHistoryLine(first)
    expect(await linkOf()).toBe('')

    const next = await service(600_000, '')

    expect((await expenseById(next))?.values[WALLET_ACCOUNT_FIELD_ID]).toBe('')
    expect(await balance()).toBe(START)
    await expectBalanceAndLedgerAgree()
  })

  it('follows a delete made on the records page, and a stale link still finds the account', async () => {
    const first = await firstService(1_450_000)
    const second = await service(2_100_000, first, '2026-10-25')

    await handleExpenseRecordDeleted(ID, second, 'خودرو')
    await deleteLinkedExpenseRecord(ID, second)
    expect(await linkOf()).toBe(first)
    expect(await expenseRecords()).toHaveLength(1)

    // A row left pointing at a deleted expense (an older app version) falls back to the history.
    const third = await service(600_000, first, '2026-10-30')

    await deleteLinkedExpenseRecord(ID, third)

    const fourth = await service(300_000, third, '2026-10-31')

    expect((await expenseById(fourth))?.values[WALLET_ACCOUNT_FIELD_ID]).toBe('wallet-1')
    expect(await balance()).toBe(START - 1_450_000 - 300_000)
    await expectBalanceAndLedgerAgree()
  })
})
