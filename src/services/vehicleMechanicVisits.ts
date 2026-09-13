import { appendSheetRow, deleteSheetRow, ensureSheetWithHeaders, fetchSheetRows } from './sheets'
import type { VehicleMechanicItem, VehicleMechanicVisit } from '../types/vehicles'

export const VEHICLE_MECHANIC_SHEET = 'مکانیک_خودرو'

export const VEHICLE_MECHANIC_HEADERS = [
  'شناسه',
  'خودرو_id',
  'زمان_ثبت',
  'تاریخ',
  'کارکرد',
  'مکان',
  'مبلغ_کل',
  'اقلام_json',
  'توضیحات',
  'expense_id'
]

export function parseMechanicItems(raw: string): VehicleMechanicItem[] {
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as VehicleMechanicItem[]

    if (!Array.isArray(parsed)) return []

    return parsed
      .map(item => ({
        category: String(item.category ?? '').trim(),
        note: String(item.note ?? '').trim()
      }))
      .filter(item => item.category)
  } catch {
    return []
  }
}

function formatMechanicItems(items: VehicleMechanicItem[]): string {
  return JSON.stringify(items)
}

function rowToMechanicVisit(
  row: string[],
  rowNumber: number
): (VehicleMechanicVisit & { rowNumber: number }) | null {
  const id = String(row[0] ?? '').trim()

  if (!id) return null

  return {
    rowNumber,
    id,
    vehicleId: row[1] ?? '',
    createdAt: row[2] ?? '',
    date: row[3] ?? '',
    mileage: Math.max(0, Number(row[4]) || 0),
    location: row[5] ?? '',
    totalAmount: Math.max(0, Number(row[6]) || 0),
    items: parseMechanicItems(row[7] ?? ''),
    notes: row[8] ?? '',
    expenseRecordId: row[9] ?? ''
  }
}

function mechanicVisitToRow(item: VehicleMechanicVisit): string[] {
  return [
    item.id,
    item.vehicleId,
    item.createdAt,
    item.date,
    String(item.mileage),
    item.location,
    String(item.totalAmount),
    formatMechanicItems(item.items),
    item.notes,
    item.expenseRecordId
  ]
}

export async function ensureVehicleMechanicSheet(spreadsheetId: string): Promise<void> {
  await ensureSheetWithHeaders(spreadsheetId, VEHICLE_MECHANIC_SHEET, VEHICLE_MECHANIC_HEADERS)
}

export async function fetchVehicleMechanicVisits(
  spreadsheetId: string,
  vehicleId: string
): Promise<(VehicleMechanicVisit & { rowNumber: number })[]> {
  await ensureVehicleMechanicSheet(spreadsheetId)

  const rows = await fetchSheetRows(spreadsheetId, VEHICLE_MECHANIC_SHEET)

  return rows
    .map((row, index) => rowToMechanicVisit(row, index + 2))
    .filter((item): item is VehicleMechanicVisit & { rowNumber: number } => item != null)
    .filter(item => item.vehicleId === vehicleId)
    .sort((a, b) => b.date.localeCompare(a.date))
}

export async function createVehicleMechanicVisit(
  spreadsheetId: string,
  input: Omit<VehicleMechanicVisit, 'id' | 'createdAt' | 'expenseRecordId'> & {
    expenseRecordId?: string
  }
): Promise<VehicleMechanicVisit & { rowNumber: number }> {
  await ensureVehicleMechanicSheet(spreadsheetId)

  const item: VehicleMechanicVisit = {
    id: crypto.randomUUID(),
    createdAt: new Date().toLocaleString('fa-IR'),
    vehicleId: input.vehicleId,
    date: input.date,
    mileage: input.mileage,
    location: input.location,
    totalAmount: input.totalAmount,
    items: input.items,
    notes: input.notes.trim(),
    expenseRecordId: input.expenseRecordId ?? ''
  }

  await appendSheetRow(spreadsheetId, VEHICLE_MECHANIC_SHEET, mechanicVisitToRow(item))

  const items = await fetchVehicleMechanicVisits(spreadsheetId, input.vehicleId)
  const created = items.find(entry => entry.id === item.id)

  if (!created) throw new Error('ثبت مراجعه مکانیکی ناموفق بود')

  return created
}

export async function deleteVehicleMechanicVisit(
  spreadsheetId: string,
  rowNumber: number
): Promise<void> {
  await deleteSheetRow(spreadsheetId, VEHICLE_MECHANIC_SHEET, rowNumber)
}

export function formatMechanicItemsSummary(items: VehicleMechanicItem[]): string {
  return items
    .map(item => (item.note ? `${item.category}: ${item.note}` : item.category))
    .join(' · ')
}
