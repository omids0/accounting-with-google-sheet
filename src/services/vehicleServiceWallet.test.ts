import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as SettingsModule from './settings'
import {
  VEHICLE_EXPENSE_META_HEADERS,
  VEHICLE_MECHANIC_HEADERS,
  VEHICLES_HEADERS
} from './sheetHeadersVehicle'
import {
  VEHICLE_EXPENSE_META_SHEET,
  VEHICLE_MECHANIC_SHEET,
  VEHICLES_SHEET,
  WALLET_SHEET
} from './sheetNames'
import { fetchRecords } from './sheets'
import { markSheetsPrepared } from './sheetsMeta'
import { clearStore, setSheetAllRows } from './spreadsheetStore'
import { completePeriodicService, saveMechanicVisit } from './vehicleActions'
import { createManualVehicleExpense } from './vehicleExpenseActions'
import { createVehicleExpense } from './vehicleExpenses'
import { VEHICLE_HISTORY_HEADERS, VEHICLE_HISTORY_SHEET } from './vehicleHistory'
import {
  createVehiclePeriodicService,
  fetchVehiclePeriodicServices,
  VEHICLE_PERIODIC_HEADERS,
  VEHICLE_PERIODIC_SHEET
} from './vehiclePeriodicServices'
import {
  buildVehicleExpenseTypeBreakdown,
  fetchVehicleTransactions,
  sumVehicleTransactionAmounts
} from './vehicleTransactions'
import { fetchWalletAccounts } from './wallet'
import { fetchLedger, WALLET_LEDGER_HEADERS, WALLET_LEDGER_SHEET } from './walletLedger'
import { seedDashboardSheets, testSettings } from '../test/dashboardFixtures'

const mocks = vi.hoisted(() => ({ enqueue: vi.fn() }))

vi.mock('./sheetSync', () => ({ enqueueSheetWrite: mocks.enqueue, queueOutboxWrite: vi.fn() }))
vi.mock('./settings', async importOriginal => ({
  ...(await importOriginal<typeof SettingsModule>()),
  getSettings: () => testSettings,
  updateFormCategories: vi.fn()
}))
vi.mock('../utils/toast', () => ({ showError: vi.fn(), showInfo: vi.fn(), showSuccess: vi.fn() }))

const ID = 'vehicle-service-wallet'
const START = 10_000_000

const vehicle = { id: 'v1', title: 'پژو', mileage: 1000, rowNumber: 2 } as never

function seed(): void {
  clearStore(ID)
  localStorage.clear()
  seedDashboardSheets(ID, START)
  setSheetAllRows(ID, WALLET_LEDGER_SHEET, [WALLET_LEDGER_HEADERS])
  setSheetAllRows(ID, VEHICLE_PERIODIC_SHEET, [VEHICLE_PERIODIC_HEADERS])
  setSheetAllRows(ID, VEHICLE_HISTORY_SHEET, [VEHICLE_HISTORY_HEADERS])
  setSheetAllRows(ID, VEHICLES_SHEET, [VEHICLES_HEADERS])
  setSheetAllRows(ID, VEHICLE_MECHANIC_SHEET, [VEHICLE_MECHANIC_HEADERS])
  setSheetAllRows(ID, VEHICLE_EXPENSE_META_SHEET, [VEHICLE_EXPENSE_META_HEADERS])
  // The tabs exist: no call to Google to check them.
  markSheetsPrepared(ID, [
    ...testSettings.forms.map(form => form.sheetName),
    WALLET_SHEET,
    WALLET_LEDGER_SHEET,
    VEHICLE_PERIODIC_SHEET,
    VEHICLE_HISTORY_SHEET,
    VEHICLES_SHEET,
    VEHICLE_MECHANIC_SHEET,
    VEHICLE_EXPENSE_META_SHEET
  ])
}

async function balance(): Promise<number> {
  return (await fetchWalletAccounts(ID)).find(account => account.id === 'wallet-1')!.balance
}

/** The service as «ثبت انجام سرویس» is filled in; `previous` is the expense it replaces. */
async function service(amount: number, previous: string) {
  const [row] = await fetchVehiclePeriodicServices(ID, 'v1')

  await completePeriodicService({
    spreadsheetId: ID,
    vehicle,
    rowNumber: row.rowNumber,
    serviceType: 'تعویض روغن',
    serviceId: row.id,
    mileage: 1000,
    intervalKm: 5000,
    brand: '',
    location: '',
    amount,
    notes: '',
    date: '2026-10-20',
    previousExpenseId: previous,
    isHistorical: true
  })

  return (await fetchVehiclePeriodicServices(ID, 'v1'))[0].expenseRecordId
}

async function firstService(amount: number): Promise<string> {
  const expenseId = await createVehicleExpense(ID, {
    title: 'تعویض روغن — پژو',
    amount,
    date: '2026-10-01',
    walletAccount: 'wallet-1'
  })

  await createVehiclePeriodicService(ID, {
    vehicleId: 'v1',
    serviceType: 'تعویض روغن',
    currentMileage: 900,
    intervalKm: 5000,
    nextKm: 5900,
    brand: '',
    location: '',
    amount,
    notes: '',
    expenseRecordId: expenseId
  })

  return expenseId
}

async function carRecordsTotal(): Promise<number> {
  const form = testSettings.forms.find(item => item.type === 'expense')!
  const records = await fetchRecords(ID, form)

  return records
    .filter(record => record.values.category === 'خودرو')
    .reduce((sum, record) => sum + Number(record.values.amount), 0)
}

describe('«ثبت انجام سرویس» again', () => {
  beforeEach(() => {
    seed()
  })

  it('moves the account by the difference only, however often it is redone', async () => {
    const first = await firstService(1_450_000)

    expect(await balance()).toBe(START - 1_450_000)

    const second = await service(2_100_000, first)

    expect(await balance()).toBe(START - 2_100_000)

    const third = await service(2_100_000, second)

    expect(await balance()).toBe(START - 2_100_000)

    await service(1_000_000, third)
    expect(await balance()).toBe(START - 1_000_000)
  })

  it('writes one ledger line for a replaced expense, none when the amount is the same', async () => {
    const first = await firstService(1_450_000)
    const before = (await fetchLedger(ID, 'wallet-1')).length

    const second = await service(2_100_000, first)
    const lines = await fetchLedger(ID, 'wallet-1')

    expect(lines).toHaveLength(before + 1)
    expect(lines[0]).toMatchObject({ delta: -650_000, source: 'ویرایش', recordId: second })

    await service(2_100_000, second)
    expect(await fetchLedger(ID, 'wallet-1')).toHaveLength(before + 1)
  })

  it('sends ONE write to the account row, and a ledger that still adds up per record', async () => {
    const first = await firstService(1_450_000)

    mocks.enqueue.mockClear()

    const second = await service(2_100_000, first)
    const walletWrites = mocks.enqueue.mock.calls.filter(([, op]) => op.sheetName === WALLET_SHEET)

    expect(walletWrites).toHaveLength(1)
    expect(second).toBe(first)

    const lines = (await fetchLedger(ID, 'wallet-1')).filter(line => line.recordId === second)

    expect(lines.reduce((sum, line) => sum + line.delta, 0)).toBe(-2_100_000)
  })

  it('refunds an expense that is redone with no amount', async () => {
    const first = await firstService(1_450_000)

    expect(await service(0, first)).toBe('')
    expect(await balance()).toBe(START)
  })

  it('moves nothing for an expense that did not touch the balance', async () => {
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
    await service(700, id)

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

    expect(await carRecordsTotal()).toBe(3_000_000)
    expect(sumVehicleTransactionAmounts(items)).toBe(3_000_000)
    expect(buildVehicleExpenseTypeBreakdown(items).reduce((s, row) => s + row.total, 0)).toBe(
      3_000_000
    )
  })
})
