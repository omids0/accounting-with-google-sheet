import { appendSheetRow, deleteSheetRow, ensureSheetWithHeaders, fetchSheetRows } from './sheets'
import type { VehicleHistoryEntry, VehicleRecordKind } from '../types/vehicles'

export const VEHICLE_HISTORY_SHEET = 'تاریخچه_خودرو'

export const VEHICLE_HISTORY_HEADERS = [
  'شناسه',
  'خودرو_id',
  'زمان_ثبت',
  'نوع_رکورد',
  'مرجع_id',
  'تاریخ',
  'کارکرد',
  'km_بعدی',
  'جزئیات',
  'مبلغ',
  'expense_id'
]

const VALID_KINDS = new Set<VehicleRecordKind>(['periodic', 'deadline', 'mechanic'])

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
    mileage: Math.max(0, Number(row[6]) || 0),
    nextKm: Math.max(0, Number(row[7]) || 0),
    details: row[8] ?? '',
    amount: Math.max(0, Number(row[9]) || 0),
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

export async function deleteVehicleHistoryEntry(
  spreadsheetId: string,
  rowNumber: number
): Promise<void> {
  await deleteSheetRow(spreadsheetId, VEHICLE_HISTORY_SHEET, rowNumber)
}
