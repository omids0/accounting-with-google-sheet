import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as SettingsModule from './settings'
import { WALLET_SHEET } from './sheetNames'
import { saveMechanicVisit } from './vehicleActions'
import { createManualVehicleExpense } from './vehicleExpenseActions'
import { createVehicleExpense } from './vehicleExpenses'
import { fetchVehicleHistory } from './vehicleHistory'
import { createVehiclePeriodicService } from './vehiclePeriodicServices'
import {
  buildVehicleExpenseTypeBreakdown,
  fetchVehicleTransactions,
  sumVehicleTransactionAmounts
} from './vehicleTransactions'
import { fetchLedger } from './walletLedger'
import { WALLET_ACCOUNT_FIELD_ID, WALLET_APPLY_FIELD_ID } from '../components/form/fieldUtils'
import { testSettings } from '../test/dashboardFixtures'
import {
  balance,
  carRecordsTotal,
  expectBalanceAndLedgerAgree,
  expenseById,
  expenseRecords,
  firstService,
  ID,
  seed,
  service,
  START,
  vehicle
} from '../test/vehicleServiceFixtures'

const mocks = vi.hoisted(() => ({ enqueue: vi.fn() }))

vi.mock('./sheetSync', () => ({ enqueueSheetWrite: mocks.enqueue, queueOutboxWrite: vi.fn() }))
vi.mock('./settings', async importOriginal => ({
  ...(await importOriginal<typeof SettingsModule>()),
  getSettings: () => testSettings,
  updateFormCategories: vi.fn()
}))
vi.mock('../utils/toast', () => ({ showError: vi.fn(), showInfo: vi.fn(), showSuccess: vi.fn() }))

describe('«ثبت انجام سرویس» again: the wallet and the ledger', () => {
  beforeEach(() => {
    seed()
  })

  it('creates a new expense and leaves the earlier cycle untouched', async () => {
    const first = await firstService(1_450_000)
    const before = await expenseById(first)
    const second = await service(2_100_000, first, '2026-10-25')

    expect(second).not.toBe(first)
    expect(await expenseById(first)).toEqual(before)
    expect(await expenseRecords()).toHaveLength(2)
    expect((await expenseById(second))?.values).toMatchObject({
      amount: '2100000',
      date: '2026-10-25',
      title: 'تعویض روغن — پژو'
    })
  })

  it('moves the account once per cycle, never refunds an earlier one, and the ledger agrees', async () => {
    const first = await firstService(1_450_000)
    const before = (await fetchLedger(ID, 'wallet-1')).length

    mocks.enqueue.mockClear()

    const second = await service(2_100_000, first)
    const walletWrites = mocks.enqueue.mock.calls.filter(([, op]) => op.sheetName === WALLET_SHEET)
    const lines = await fetchLedger(ID, 'wallet-1')

    expect(walletWrites).toHaveLength(1)
    expect(lines).toHaveLength(before + 1)
    expect(lines[0]).toMatchObject({ delta: -2_100_000, source: 'ثبت', recordId: second })
    expect(lines.filter(line => line.recordId === first).map(line => line.delta)).toEqual([
      -1_450_000
    ])
    expect(await balance()).toBe(START - 1_450_000 - 2_100_000)
    await expectBalanceAndLedgerAgree()
  })

  it('keeps one expense and one history line per cycle, however often it is redone', async () => {
    let previous = await firstService(1_000_000)

    for (const amount of [1_100_000, 1_200_000, 1_200_000]) {
      previous = await service(amount, previous)
    }

    expect(await expenseRecords()).toHaveLength(4)
    expect(await fetchVehicleHistory(ID, 'v1')).toHaveLength(4)
    expect(await balance()).toBe(START - 4_500_000)
    await expectBalanceAndLedgerAgree()
  })

  it('stays consistent when two redos are saved at the same moment', async () => {
    const first = await firstService(1_000_000)

    await Promise.all([
      service(500_000, first, '2026-10-20'),
      service(700_000, first, '2026-10-21')
    ])

    expect(await expenseRecords()).toHaveLength(3)
    expect(await balance()).toBe(START - 2_200_000)
    await expectBalanceAndLedgerAgree()
  })

  it('makes no expense for a redo with no amount, and leaves the earlier one alone', async () => {
    const first = await firstService(1_450_000)

    expect(await service(0, first)).toBe('')
    expect(await expenseById(first)).toBeDefined()
    expect(await balance()).toBe(START - 1_450_000)
    await expectBalanceAndLedgerAgree()
  })

  it('pays the new cycle from the same account, and moves nothing when the last one opted out', async () => {
    const id = await createVehicleExpense(ID, {
      title: 'روغن',
      amount: 500,
      walletAccount: 'wallet-1',
      walletApply: 'خیر'
    })

    await createVehiclePeriodicService(ID, {
      vehicleId: 'v1',
      serviceType: 'تعویض روغن',
      currentMileage: 900,
      intervalKm: 5000,
      nextKm: 5900,
      brand: '',
      location: '',
      amount: 500,
      notes: '',
      expenseRecordId: id
    })

    const second = await service(700, id)

    expect((await expenseById(second))?.values).toMatchObject({
      [WALLET_ACCOUNT_FIELD_ID]: 'wallet-1',
      [WALLET_APPLY_FIELD_ID]: 'خیر'
    })
    expect(await balance()).toBe(START)
  })
})

describe('the car page total equals the car expenses in the records', () => {
  beforeEach(() => {
    seed()
  })

  it('for services (redone), a mechanic visit and fuel made by the app', async () => {
    const first = await firstService(1_450_000)

    await service(2_100_000, first)
    await saveMechanicVisit({
      spreadsheetId: ID,
      vehicle,
      date: '2026-10-21',
      mileage: 0,
      location: '',
      totalAmount: 300_000,
      items: [],
      notes: '',
      isHistorical: true
    })
    await createManualVehicleExpense(ID, {
      vehicleId: 'v1',
      expenseType: 'بنزین',
      fuelPricePerLiter: 15_000,
      mileage: '',
      date: '2026-10-22',
      amount: 600_000
    })

    const items = await fetchVehicleTransactions(ID, 'v1')

    expect(await carRecordsTotal()).toBe(4_450_000)
    expect(sumVehicleTransactionAmounts(items)).toBe(4_450_000)
    expect(buildVehicleExpenseTypeBreakdown(items).reduce((s, row) => s + row.total, 0)).toBe(
      4_450_000
    )
  })
})
