import { VEHICLE_HISTORY_HEADERS } from './sheetHeaders'
import { VEHICLE_HISTORY_SHEET } from './sheetNames'
import {
  appendSheetRow,
  deleteSheetRow,
  ensureSheetWithHeaders,
  fetchSheetRows,
  updateSheetRow
} from './sheets'
import type { VehicleHistoryEntry, VehicleRecordKind } from '../types/vehicles'
import { parseNumeric } from '../utils/parseNumeric'

export { VEHICLE_HISTORY_SHEET, VEHICLE_HISTORY_HEADERS }

const VALID_KINDS = new Set<VehicleRecordKind>(['periodic', 'deadline', 'mechanic', 'mileage'])

function parseKind(value: string): VehicleRecordKind {
  const normalized = String(value ?? '').trim() as VehicleRecordKind

  return VALID_KINDS.has(normalized) ? normalized : 'periodic'
}

function rowToHistory(
  row: string[],
  rowNumber: number
): (VehicleHistoryEntry & { rowNumber: number }) | null {
  const id = String(row[0] ?? '').trim()

  if (!id) return null

  return {
    rowNumber,
    id,
    vehicleId: row[1] ?? '',
    createdAt: row[2] ?? '',
    recordKind: parseKind(row[3] ?? ''),
    referenceId: row[4] ?? '',
    date: row[5] ?? '',
    mileage: Math.max(0, parseNumeric(row[6])),
    nextKm: Math.max(0, parseNumeric(row[7])),
    details: row[8] ?? '',
    amount: Math.max(0, parseNumeric(row[9])),
    expenseRecordId: row[10] ?? ''
  }
}

function historyToRow(item: VehicleHistoryEntry): string[] {
  return [
    item.id,
    item.vehicleId,
    item.createdAt,
    item.recordKind,
    item.referenceId,
    item.date,
    String(item.mileage),
    String(item.nextKm),
    item.details,
    String(item.amount),
    item.expenseRecordId
  ]
}

export async function ensureVehicleHistorySheet(spreadsheetId: string): Promise<void> {
  await ensureSheetWithHeaders(spreadsheetId, VEHICLE_HISTORY_SHEET, VEHICLE_HISTORY_HEADERS)
}

export async function fetchVehicleHistory(
  spreadsheetId: string,
  vehicleId: string
): Promise<(VehicleHistoryEntry & { rowNumber: number })[]> {
  await ensureVehicleHistorySheet(spreadsheetId)

  const rows = await fetchSheetRows(spreadsheetId, VEHICLE_HISTORY_SHEET)

  return rows
    .map((row, index) => rowToHistory(row, index + 2))
    .filter((item): item is VehicleHistoryEntry & { rowNumber: number } => item != null)
    .filter(item => item.vehicleId === vehicleId)
    .sort((a, b) => b.date.localeCompare(a.date))
}

export async function createVehicleHistoryEntry(
  spreadsheetId: string,
  input: Omit<VehicleHistoryEntry, 'id' | 'createdAt'>
): Promise<VehicleHistoryEntry & { rowNumber: number }> {
  await ensureVehicleHistorySheet(spreadsheetId)

  const item: VehicleHistoryEntry = {
    id: crypto.randomUUID(),
    createdAt: new Date().toLocaleString('fa-IR'),
    vehicleId: input.vehicleId,
    recordKind: input.recordKind,
    referenceId: input.referenceId,
    date: input.date,
    mileage: input.mileage,
    nextKm: input.nextKm,
    details: input.details,
    amount: input.amount,
    expenseRecordId: input.expenseRecordId
  }

  await appendSheetRow(spreadsheetId, VEHICLE_HISTORY_SHEET, historyToRow(item))

  const items = await fetchVehicleHistory(spreadsheetId, input.vehicleId)
  const created = items.find(entry => entry.id === item.id)

  if (!created) throw new Error('ثبت تاریخچه ناموفق بود')

  return created
}

/** Rewrites a history line in place (its id and creation time stay). */
export async function updateVehicleHistoryEntry(
  spreadsheetId: string,
  rowNumber: number,
  patch: Partial<Omit<VehicleHistoryEntry, 'id' | 'createdAt'>>
): Promise<void> {
  const rows = await fetchSheetRows(spreadsheetId, VEHICLE_HISTORY_SHEET)
  const current = rowToHistory(rows[rowNumber - 2] ?? [], rowNumber)

  if (!current) throw new Error('ثبت تاریخچه یافت نشد')

  await updateSheetRow(
    spreadsheetId,
    VEHICLE_HISTORY_SHEET,
    rowNumber,
    historyToRow({ ...current, ...patch, id: current.id, createdAt: current.createdAt })
  )
}

export async function deleteVehicleHistoryEntry(
  spreadsheetId: string,
  rowNumber: number
): Promise<void> {
  await deleteSheetRow(spreadsheetId, VEHICLE_HISTORY_SHEET, rowNumber)
}

/**
 * One «ثبت کارکرد» line, so the mileage log lists every reading whichever form raised it.
 * `referenceId` ties a reading to the expense that carried it.
 */
export async function logMileageReading(
  spreadsheetId: string,
  vehicleId: string,
  mileage: number,
  date: string,
  details: string,
  referenceId = ''
): Promise<void> {
  await createVehicleHistoryEntry(spreadsheetId, {
    vehicleId,
    recordKind: 'mileage',
    referenceId,
    date,
    mileage,
    nextKm: 0,
    details,
    amount: 0,
    expenseRecordId: ''
  })
}

/** An expense that carried a reading is gone: its «ثبت کارکرد» line goes with it. */
export async function deleteMileageLogsByReference(
  spreadsheetId: string,
  vehicleId: string,
  referenceId: string
): Promise<void> {
  if (!vehicleId || !referenceId) return

  const lines = (await fetchVehicleHistory(spreadsheetId, vehicleId))
    .filter(item => item.recordKind === 'mileage' && item.referenceId === referenceId)
    .sort((a, b) => b.rowNumber - a.rowNumber)

  // Highest row first, so the rows still to delete keep their numbers.
  for (const line of lines) await deleteVehicleHistoryEntry(spreadsheetId, line.rowNumber)
}
