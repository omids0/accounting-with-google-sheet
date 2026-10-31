import { expect } from 'vitest'

import { seedDashboardSheets, testSettings } from './dashboardFixtures'
import {
  VEHICLE_EXPENSE_META_HEADERS,
  VEHICLE_MECHANIC_HEADERS,
  VEHICLES_HEADERS
} from '../services/sheetHeadersVehicle'
import {
  VEHICLE_EXPENSE_META_SHEET,
  VEHICLE_MECHANIC_SHEET,
  VEHICLES_SHEET,
  WALLET_SHEET
} from '../services/sheetNames'
import { fetchRecords } from '../services/sheets'
import { markSheetsPrepared } from '../services/sheetsMeta'
import { clearStore, setSheetAllRows } from '../services/spreadsheetStore'
import { createVehicleExpense } from '../services/vehicleExpenses'
import {
  createVehicleHistoryEntry,
  VEHICLE_HISTORY_HEADERS,
  VEHICLE_HISTORY_SHEET
} from '../services/vehicleHistory'
import { completePeriodicService } from '../services/vehiclePeriodicComplete'
import {
  createVehiclePeriodicService,
  fetchVehiclePeriodicServices,
  VEHICLE_PERIODIC_HEADERS,
  VEHICLE_PERIODIC_SHEET
} from '../services/vehiclePeriodicServices'
import { fetchWalletAccounts } from '../services/wallet'
import { fetchLedger, WALLET_LEDGER_HEADERS, WALLET_LEDGER_SHEET } from '../services/walletLedger'

export const ID = 'vehicle-service-wallet'
export const START = 10_000_000
export const vehicle = { id: 'v1', title: 'پژو', mileage: 1000, rowNumber: 2 } as never
export const expenseForm = testSettings.forms.find(item => item.type === 'expense')!

export function seed(): void {
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

export async function balance(): Promise<number> {
  return (await fetchWalletAccounts(ID)).find(account => account.id === 'wallet-1')!.balance
}

/** The service as «ثبت انجام سرویس» is filled in; `previous` is the expense of the cycle before. */
export async function service(amount: number, previous: string, date = '2026-10-20') {
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
    date,
    previousExpenseId: previous,
    isHistorical: true
  })

  return (await fetchVehiclePeriodicServices(ID, 'v1'))[0].expenseRecordId
}

/** The first cycle, as the service form writes it: expense, service row and history line. */
export async function firstService(amount: number): Promise<string> {
  const expenseId = await createVehicleExpense(ID, {
    title: 'تعویض روغن — پژو',
    amount,
    date: '2026-10-01',
    walletAccount: 'wallet-1'
  })
  const created = await createVehiclePeriodicService(ID, {
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

  await createVehicleHistoryEntry(ID, {
    vehicleId: 'v1',
    recordKind: 'periodic',
    referenceId: created.id,
    date: '2026-10-01',
    mileage: 900,
    nextKm: 5900,
    details: 'تعویض روغن',
    amount,
    expenseRecordId: expenseId
  })

  return expenseId
}

export async function expenseRecords() {
  return (await fetchRecords(ID, expenseForm)).filter(record => record.values.category === 'خودرو')
}

export async function expenseById(id: string) {
  return (await fetchRecords(ID, expenseForm)).find(record => record.id === id)
}

export async function carRecordsTotal(): Promise<number> {
  return (await expenseRecords()).reduce((sum, record) => sum + Number(record.values.amount), 0)
}

/** What the account's ledger lines add up to: it must always equal how far the balance moved. */
export async function expectBalanceAndLedgerAgree(): Promise<void> {
  const total = (await fetchLedger(ID, 'wallet-1')).reduce((sum, line) => sum + line.delta, 0)

  expect(START + total).toBe(await balance())
}
