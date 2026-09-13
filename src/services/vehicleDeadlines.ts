import {
  appendSheetRow,
  deleteSheetRow,
  ensureSheetWithHeaders,
  fetchSheetRows,
  updateSheetRow
} from './sheets'
import type { VehicleDeadline } from '../types/vehicles'

export const VEHICLE_DEADLINE_SHEET = 'موعد_خودرو'

export const VEHICLE_DEADLINE_HEADERS = [
  'شناسه',
  'خودرو_id',
  'زمان_ثبت',
  'دسته',
  'تاریخ_شروع',
  'تاریخ_پایان',
  'مبلغ',
  'توضیحات',
  'expense_id',
  'فعال'
]

function parseBool(value: string | undefined): boolean {
  const v = String(value ?? '')
    .trim()
    .toLowerCase()

  return v === 'true' || v === '1' || v === 'بله' || v === 'yes'
}

function rowToDeadline(
  row: string[],
  rowNumber: number
): (VehicleDeadline & { rowNumber: number }) | null {
  const id = String(row[0] ?? '').trim()

  if (!id) return null

  return {
    rowNumber,
    id,
    vehicleId: row[1] ?? '',
    createdAt: row[2] ?? '',
    category: row[3] ?? '',
    startDate: row[4] ?? '',
    endDate: row[5] ?? '',
    amount: Math.max(0, Number(row[6]) || 0),
    notes: row[7] ?? '',
    expenseRecordId: row[8] ?? '',
    active: parseBool(row[9] ?? 'true')
  }
}

function deadlineToRow(item: VehicleDeadline): string[] {
  return [
    item.id,
    item.vehicleId,
    item.createdAt,
    item.category,
    item.startDate,
    item.endDate,
    String(item.amount),
    item.notes,
    item.expenseRecordId,
    item.active ? 'TRUE' : 'FALSE'
  ]
}

export async function ensureVehicleDeadlineSheet(spreadsheetId: string): Promise<void> {
  await ensureSheetWithHeaders(spreadsheetId, VEHICLE_DEADLINE_SHEET, VEHICLE_DEADLINE_HEADERS)
}

export async function fetchVehicleDeadlines(
  spreadsheetId: string,
  vehicleId?: string
): Promise<(VehicleDeadline & { rowNumber: number })[]> {
  await ensureVehicleDeadlineSheet(spreadsheetId)

  const rows = await fetchSheetRows(spreadsheetId, VEHICLE_DEADLINE_SHEET)

  return rows
    .map((row, index) => rowToDeadline(row, index + 2))
    .filter((item): item is VehicleDeadline & { rowNumber: number } => item != null)
    .filter(item => (vehicleId ? item.vehicleId === vehicleId && item.active : item.active))
}

export async function createVehicleDeadline(
  spreadsheetId: string,
  input: Omit<VehicleDeadline, 'id' | 'createdAt' | 'expenseRecordId' | 'active'> & {
    expenseRecordId?: string
    active?: boolean
  }
): Promise<VehicleDeadline & { rowNumber: number }> {
  await ensureVehicleDeadlineSheet(spreadsheetId)

  const item: VehicleDeadline = {
    id: crypto.randomUUID(),
    createdAt: new Date().toLocaleString('fa-IR'),
    vehicleId: input.vehicleId,
    category: input.category.trim(),
    startDate: input.startDate,
    endDate: input.endDate,
    amount: input.amount,
    notes: input.notes.trim(),
    expenseRecordId: input.expenseRecordId ?? '',
    active: input.active ?? true
  }

  await appendSheetRow(spreadsheetId, VEHICLE_DEADLINE_SHEET, deadlineToRow(item))

  const items = await fetchVehicleDeadlines(spreadsheetId, input.vehicleId)
  const created = items.find(entry => entry.id === item.id)

  if (!created) throw new Error('ثبت موعد ناموفق بود')

  return created
}

export async function updateVehicleDeadline(
  spreadsheetId: string,
  rowNumber: number,
  patch: Partial<VehicleDeadline>
): Promise<void> {
  const rows = await fetchSheetRows(spreadsheetId, VEHICLE_DEADLINE_SHEET)
  const current = rowToDeadline(rows[rowNumber - 2] ?? [], rowNumber)

  if (!current) throw new Error('موعد یافت نشد')

  await updateSheetRow(
    spreadsheetId,
    VEHICLE_DEADLINE_SHEET,
    rowNumber,
    deadlineToRow({ ...current, ...patch, id: current.id, createdAt: current.createdAt })
  )
}

export async function deleteVehicleDeadline(
  spreadsheetId: string,
  rowNumber: number
): Promise<void> {
  await deleteSheetRow(spreadsheetId, VEHICLE_DEADLINE_SHEET, rowNumber)
}

export async function fetchAllVehicleDeadlines(
  spreadsheetId: string
): Promise<(VehicleDeadline & { rowNumber: number })[]> {
  await ensureVehicleDeadlineSheet(spreadsheetId)

  const rows = await fetchSheetRows(spreadsheetId, VEHICLE_DEADLINE_SHEET)

  return rows
    .map((row, index) => rowToDeadline(row, index + 2))
    .filter((item): item is VehicleDeadline & { rowNumber: number } => item != null)
}
