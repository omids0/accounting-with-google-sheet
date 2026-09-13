import {
  appendSheetRow,
  deleteSheetRow,
  ensureSheetWithHeaders,
  fetchSheetRows,
  updateSheetRow
} from './sheets'
import type { VehicleMileageReminderInterval, VehicleProfile } from '../types/vehicles'
import { getTodayIso } from '../utils/jalaliDate'

export const VEHICLES_SHEET = 'خودرو'

export const VEHICLES_HEADERS = [
  'شناسه',
  'زمان_ثبت',
  'عنوان',
  'کارکرد',
  'VIN',
  'سال_ساخت',
  'ظرفیت',
  'پلاک',
  'یادآوری_کارکرد',
  'آخرین_بروز_کارکرد',
  'فعال'
]

const VALID_INTERVALS = new Set<VehicleMileageReminderInterval>([
  'first-of-month',
  'every-2-months',
  'every-3-months',
  'every-6-months',
  'yearly',
  'weekly',
  'biweekly',
  'triweekly',
  'daily',
  'every-3-days',
  'every-10-days'
])

function parseBool(value: string | undefined): boolean {
  const v = String(value ?? '')
    .trim()
    .toLowerCase()

  return v === 'true' || v === '1' || v === 'بله' || v === 'yes'
}

function parseInterval(value: string): VehicleMileageReminderInterval {
  const normalized = String(value ?? '').trim() as VehicleMileageReminderInterval

  return VALID_INTERVALS.has(normalized) ? normalized : 'first-of-month'
}

function rowToVehicle(
  row: string[],
  rowNumber: number
): (VehicleProfile & { rowNumber: number }) | null {
  const id = String(row[0] ?? '').trim()

  if (!id) return null

  return {
    rowNumber,
    id,
    createdAt: row[1] ?? '',
    title: row[2] ?? '',
    mileage: Math.max(0, Number(row[3]) || 0),
    vin: row[4] ?? '',
    buildYear: row[5] ?? '',
    capacity: row[6] ?? '',
    plate: row[7] ?? '',
    mileageReminderInterval: parseInterval(row[8] ?? ''),
    lastMileageUpdate: row[9] ?? '',
    active: parseBool(row[10] ?? 'true')
  }
}

function vehicleToRow(item: VehicleProfile): string[] {
  return [
    item.id,
    item.createdAt,
    item.title,
    String(item.mileage),
    item.vin,
    item.buildYear,
    item.capacity,
    item.plate,
    item.mileageReminderInterval,
    item.lastMileageUpdate,
    item.active ? 'TRUE' : 'FALSE'
  ]
}

export function vehicleRowFromImportCells(cells: (string | undefined)[]): string[] | null {
  const title = String(cells[2] ?? '').trim()

  if (!title) return null

  return vehicleToRow({
    id: cells[0] ?? '',
    createdAt: cells[1] ?? '',
    title,
    mileage: Math.max(0, Number(cells[3]) || 0),
    vin: String(cells[4] ?? '').trim(),
    buildYear: String(cells[5] ?? '').trim(),
    capacity: String(cells[6] ?? '').trim(),
    plate: String(cells[7] ?? '').trim(),
    mileageReminderInterval: parseInterval(cells[8] ?? ''),
    lastMileageUpdate: String(cells[9] ?? '').trim(),
    active: parseBool(cells[10] ?? 'true')
  })
}

export async function ensureVehiclesSheet(spreadsheetId: string): Promise<void> {
  await ensureSheetWithHeaders(spreadsheetId, VEHICLES_SHEET, VEHICLES_HEADERS)
}

export async function fetchVehicles(
  spreadsheetId: string
): Promise<(VehicleProfile & { rowNumber: number })[]> {
  await ensureVehiclesSheet(spreadsheetId)

  const rows = await fetchSheetRows(spreadsheetId, VEHICLES_SHEET)

  return rows
    .map((row, index) => rowToVehicle(row, index + 2))
    .filter((item): item is VehicleProfile & { rowNumber: number } => item != null)
}

export async function createVehicle(
  spreadsheetId: string,
  input: Omit<VehicleProfile, 'id' | 'createdAt' | 'lastMileageUpdate' | 'active'> & {
    lastMileageUpdate?: string
    active?: boolean
  }
): Promise<VehicleProfile & { rowNumber: number }> {
  await ensureVehiclesSheet(spreadsheetId)

  const today = getTodayIso()
  const item: VehicleProfile = {
    id: crypto.randomUUID(),
    createdAt: new Date().toLocaleString('fa-IR'),
    title: input.title.trim(),
    mileage: input.mileage,
    vin: input.vin.trim(),
    buildYear: input.buildYear.trim(),
    capacity: input.capacity.trim(),
    plate: input.plate.trim(),
    mileageReminderInterval: input.mileageReminderInterval,
    lastMileageUpdate: input.lastMileageUpdate ?? today,
    active: input.active ?? true
  }

  await appendSheetRow(spreadsheetId, VEHICLES_SHEET, vehicleToRow(item))

  const items = await fetchVehicles(spreadsheetId)
  const created = items.find(entry => entry.id === item.id)

  if (!created) throw new Error('ثبت خودرو ناموفق بود')

  return created
}

export async function updateVehicle(
  spreadsheetId: string,
  rowNumber: number,
  patch: Partial<VehicleProfile>
): Promise<void> {
  const rows = await fetchVehicles(spreadsheetId)
  const current = rows.find(item => item.rowNumber === rowNumber)

  if (!current) throw new Error('خودرو یافت نشد')

  await updateSheetRow(
    spreadsheetId,
    VEHICLES_SHEET,
    rowNumber,
    vehicleToRow({ ...current, ...patch, id: current.id, createdAt: current.createdAt })
  )
}

export async function updateVehicleMileage(
  spreadsheetId: string,
  rowNumber: number,
  mileage: number,
  date = getTodayIso()
): Promise<void> {
  await updateVehicle(spreadsheetId, rowNumber, { mileage, lastMileageUpdate: date })
}

export async function deleteVehicle(spreadsheetId: string, rowNumber: number): Promise<void> {
  await deleteSheetRow(spreadsheetId, VEHICLES_SHEET, rowNumber)
}
