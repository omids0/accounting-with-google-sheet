import {
  appendSheetRow,
  deleteSheetRow,
  ensureSheetWithHeaders,
  fetchSheetRows,
  updateSheetRow
} from './sheets'
import type { VehiclePeriodicService } from '../types/vehicles'

export const VEHICLE_PERIODIC_SHEET = 'سرویس_خودرو'

export const VEHICLE_PERIODIC_HEADERS = [
  'شناسه',
  'خودرو_id',
  'زمان_ثبت',
  'نوع_سرویس',
  'کارکرد_فعلی',
  'فاصله_km',
  'km_بعدی',
  'برند',
  'محل',
  'مبلغ',
  'توضیحات',
  'expense_id',
  'فعال',
  'یادآوری_فعال',
  'آستانه_کیلومتر'
]

function parseBool(value: string | undefined): boolean {
  const v = String(value ?? '')
    .trim()
    .toLowerCase()

  return v === 'true' || v === '1' || v === 'بله' || v === 'yes'
}

function rowToPeriodic(
  row: string[],
  rowNumber: number
): (VehiclePeriodicService & { rowNumber: number }) | null {
  const id = String(row[0] ?? '').trim()

  if (!id) return null

  return {
    rowNumber,
    id,
    vehicleId: row[1] ?? '',
    createdAt: row[2] ?? '',
    serviceType: row[3] ?? '',
    currentMileage: Math.max(0, Number(row[4]) || 0),
    intervalKm: Math.max(0, Number(row[5]) || 0),
    nextKm: Math.max(0, Number(row[6]) || 0),
    brand: row[7] ?? '',
    location: row[8] ?? '',
    amount: Math.max(0, Number(row[9]) || 0),
    notes: row[10] ?? '',
    expenseRecordId: row[11] ?? '',
    active: parseBool(row[12] ?? 'true'),
    reminderEnabled: parseBool(row[13] ?? 'true'),
    reminderThresholdKm: Math.max(0, Number(row[14]) || 500)
  }
}

function periodicToRow(item: VehiclePeriodicService): string[] {
  return [
    item.id,
    item.vehicleId,
    item.createdAt,
    item.serviceType,
    String(item.currentMileage),
    String(item.intervalKm),
    String(item.nextKm),
    item.brand,
    item.location,
    String(item.amount),
    item.notes,
    item.expenseRecordId,
    item.active ? 'TRUE' : 'FALSE',
    item.reminderEnabled ? 'TRUE' : 'FALSE',
    String(item.reminderThresholdKm)
  ]
}

export async function ensureVehiclePeriodicSheet(spreadsheetId: string): Promise<void> {
  await ensureSheetWithHeaders(spreadsheetId, VEHICLE_PERIODIC_SHEET, VEHICLE_PERIODIC_HEADERS)
}

export async function fetchVehiclePeriodicServices(
  spreadsheetId: string,
  vehicleId?: string
): Promise<(VehiclePeriodicService & { rowNumber: number })[]> {
  await ensureVehiclePeriodicSheet(spreadsheetId)

  const rows = await fetchSheetRows(spreadsheetId, VEHICLE_PERIODIC_SHEET)

  return rows
    .map((row, index) => rowToPeriodic(row, index + 2))
    .filter((item): item is VehiclePeriodicService & { rowNumber: number } => item != null)
    .filter(item => (vehicleId ? item.vehicleId === vehicleId && item.active : item.active))
}

export async function createVehiclePeriodicService(
  spreadsheetId: string,
  input: Omit<
    VehiclePeriodicService,
    'id' | 'createdAt' | 'expenseRecordId' | 'active' | 'reminderEnabled' | 'reminderThresholdKm'
  > & {
    expenseRecordId?: string
    active?: boolean
    reminderEnabled?: boolean
    reminderThresholdKm?: number
  }
): Promise<VehiclePeriodicService & { rowNumber: number }> {
  await ensureVehiclePeriodicSheet(spreadsheetId)

  const item: VehiclePeriodicService = {
    id: crypto.randomUUID(),
    createdAt: new Date().toLocaleString('fa-IR'),
    vehicleId: input.vehicleId,
    serviceType: input.serviceType.trim(),
    currentMileage: input.currentMileage,
    intervalKm: input.intervalKm,
    nextKm: input.nextKm,
    brand: input.brand.trim(),
    location: input.location.trim(),
    amount: input.amount,
    notes: input.notes.trim(),
    expenseRecordId: input.expenseRecordId ?? '',
    active: input.active ?? true,
    reminderEnabled: input.reminderEnabled ?? true,
    reminderThresholdKm: input.reminderThresholdKm ?? 500
  }

  await appendSheetRow(spreadsheetId, VEHICLE_PERIODIC_SHEET, periodicToRow(item))

  const items = await fetchVehiclePeriodicServices(spreadsheetId, input.vehicleId)
  const created = items.find(entry => entry.id === item.id)

  if (!created) throw new Error('ثبت سرویس ناموفق بود')

  return created
}

export async function updateVehiclePeriodicService(
  spreadsheetId: string,
  rowNumber: number,
  patch: Partial<VehiclePeriodicService>
): Promise<void> {
  const rows = await fetchSheetRows(spreadsheetId, VEHICLE_PERIODIC_SHEET)
  const current = rowToPeriodic(rows[rowNumber - 2] ?? [], rowNumber)

  if (!current) throw new Error('سرویس یافت نشد')

  await updateSheetRow(
    spreadsheetId,
    VEHICLE_PERIODIC_SHEET,
    rowNumber,
    periodicToRow({ ...current, ...patch, id: current.id, createdAt: current.createdAt })
  )
}

export async function deleteVehiclePeriodicService(
  spreadsheetId: string,
  rowNumber: number
): Promise<void> {
  await deleteSheetRow(spreadsheetId, VEHICLE_PERIODIC_SHEET, rowNumber)
}

export async function fetchAllVehiclePeriodicServices(
  spreadsheetId: string
): Promise<(VehiclePeriodicService & { rowNumber: number })[]> {
  await ensureVehiclePeriodicSheet(spreadsheetId)

  const rows = await fetchSheetRows(spreadsheetId, VEHICLE_PERIODIC_SHEET)

  return rows
    .map((row, index) => rowToPeriodic(row, index + 2))
    .filter((item): item is VehiclePeriodicService & { rowNumber: number } => item != null)
}
