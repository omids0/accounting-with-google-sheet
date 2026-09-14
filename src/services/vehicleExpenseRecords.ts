import {
  appendSheetRow,
  deleteSheetRow,
  ensureSheetWithHeaders,
  fetchSheetRows,
  updateSheetRow
} from './sheets'
import type { VehicleExpenseMeta } from '../types/vehicles'

export const VEHICLE_EXPENSE_META_SHEET = 'هزینه_خودرو'

export const VEHICLE_EXPENSE_META_HEADERS = [
  'شناسه',
  'شناسه_هزینه',
  'شناسه_خودرو',
  'نوع_هزینه',
  'نرخ_لیتر',
  'لیتر',
  'کارکرد',
  'زمان_ثبت'
]

export type VehicleExpenseMetaWithRow = VehicleExpenseMeta & { rowNumber: number }

function rowToMeta(row: string[], rowNumber: number): VehicleExpenseMetaWithRow | null {
  const id = String(row[0] ?? '').trim()

  if (!id) return null

  return {
    rowNumber,
    id,
    expenseRecordId: row[1] ?? '',
    vehicleId: row[2] ?? '',
    expenseType: row[3] ?? '',
    fuelPricePerLiter: Math.max(0, Number(row[4]) || 0),
    fuelLiters: Math.max(0, Number(row[5]) || 0),
    mileage: Math.max(0, Number(row[6]) || 0),
    createdAt: row[7] ?? ''
  }
}

function metaToRow(item: VehicleExpenseMeta): string[] {
  return [
    item.id,
    item.expenseRecordId,
    item.vehicleId,
    item.expenseType,
    String(item.fuelPricePerLiter),
    String(item.fuelLiters),
    String(item.mileage),
    item.createdAt
  ]
}

export async function ensureVehicleExpenseMetaSheet(spreadsheetId: string): Promise<void> {
  await ensureSheetWithHeaders(
    spreadsheetId,
    VEHICLE_EXPENSE_META_SHEET,
    VEHICLE_EXPENSE_META_HEADERS
  )
}

export async function fetchVehicleExpenseMeta(
  spreadsheetId: string
): Promise<VehicleExpenseMetaWithRow[]> {
  await ensureVehicleExpenseMetaSheet(spreadsheetId)

  const rows = await fetchSheetRows(spreadsheetId, VEHICLE_EXPENSE_META_SHEET)

  return rows
    .map((row, index) => rowToMeta(row, index + 2))
    .filter((item): item is VehicleExpenseMetaWithRow => item !== null)
}

export async function fetchVehicleExpenseMetaByVehicle(
  spreadsheetId: string,
  vehicleId: string
): Promise<VehicleExpenseMetaWithRow[]> {
  const items = await fetchVehicleExpenseMeta(spreadsheetId)

  return items.filter(item => item.vehicleId === vehicleId)
}

export async function findVehicleExpenseMetaByRecordId(
  spreadsheetId: string,
  expenseRecordId: string
): Promise<VehicleExpenseMetaWithRow | undefined> {
  const items = await fetchVehicleExpenseMeta(spreadsheetId)

  return items.find(item => item.expenseRecordId === expenseRecordId)
}

export async function createVehicleExpenseMeta(
  spreadsheetId: string,
  input: Omit<VehicleExpenseMeta, 'id' | 'createdAt'>
): Promise<VehicleExpenseMetaWithRow> {
  await ensureVehicleExpenseMetaSheet(spreadsheetId)

  const item: VehicleExpenseMeta = {
    id: crypto.randomUUID(),
    createdAt: new Date().toLocaleString('fa-IR'),
    ...input
  }

  await appendSheetRow(spreadsheetId, VEHICLE_EXPENSE_META_SHEET, metaToRow(item))

  const created = await findVehicleExpenseMetaByRecordId(spreadsheetId, item.expenseRecordId)

  if (!created) throw new Error('ثبت متادیتای هزینه خودرو ناموفق بود')

  return created
}

export async function updateVehicleExpenseMeta(
  spreadsheetId: string,
  rowNumber: number,
  patch: Partial<VehicleExpenseMeta>
): Promise<void> {
  const items = await fetchVehicleExpenseMeta(spreadsheetId)
  const current = items.find(item => item.rowNumber === rowNumber)

  if (!current) throw new Error('متادیتای هزینه خودرو یافت نشد')

  await updateSheetRow(
    spreadsheetId,
    VEHICLE_EXPENSE_META_SHEET,
    rowNumber,
    metaToRow({ ...current, ...patch, id: current.id, createdAt: current.createdAt })
  )
}

export async function deleteVehicleExpenseMeta(
  spreadsheetId: string,
  rowNumber: number
): Promise<void> {
  await deleteSheetRow(spreadsheetId, VEHICLE_EXPENSE_META_SHEET, rowNumber)
}
