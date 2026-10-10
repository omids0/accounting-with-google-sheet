import {
  appendSheetRow,
  deleteSheetRow,
  ensureManySheetsWithHeaders,
  fetchSheetRangeFromApi,
  fetchSheetRows,
  replaceSheetDataRows,
  updateSheetRow,
  type SheetSpec
} from './sheets'
import type { DangSplitGroup } from '../types/dangSplit'

export const DANG_SPLIT_GROUPS_SHEET = 'گروه_دنگ'
export const DANG_SPLIT_CATEGORIES_SHEET = 'دسته_افراد_دنگ'
export const DANG_SPLIT_PEOPLE_SHEET = 'افراد_دنگ'
export const DANG_SPLIT_EXPENSES_SHEET = 'اقلام_دنگ'
export const DANG_SPLIT_ALLOCATIONS_SHEET = 'تخصیص_دنگ'

export const DANG_SPLIT_GROUPS_HEADERS = ['شناسه', 'زمان ثبت', 'عنوان', 'توضیحات']

export const DANG_SPLIT_CATEGORIES_HEADERS = ['شناسه', 'شناسه گروه', 'عنوان', 'زمان ثبت']

export const DANG_SPLIT_PEOPLE_HEADERS = [
  'شناسه',
  'شناسه گروه',
  'نام',
  'شناسه دسته',
  'ضریب پیش‌فرض',
  'مبلغ پرداخت‌شده',
  'زمان تسویه',
  'یادداشت',
  'واریز به صندوق'
]

export const DANG_SPLIT_EXPENSES_HEADERS = [
  'شناسه',
  'شناسه گروه',
  'عنوان',
  'تاریخ',
  'مبلغ',
  'توضیحات',
  'زمان ثبت',
  'پرداخت‌کننده'
]

export const DANG_SPLIT_ALLOCATIONS_HEADERS = [
  'شناسه',
  'شناسه گروه',
  'شناسه قلم',
  'شناسه فرد',
  'وزن'
]

export const DANG_SPLIT_SHEET_SPECS: SheetSpec[] = [
  { sheetName: DANG_SPLIT_GROUPS_SHEET, headers: DANG_SPLIT_GROUPS_HEADERS },
  { sheetName: DANG_SPLIT_CATEGORIES_SHEET, headers: DANG_SPLIT_CATEGORIES_HEADERS },
  { sheetName: DANG_SPLIT_PEOPLE_SHEET, headers: DANG_SPLIT_PEOPLE_HEADERS },
  { sheetName: DANG_SPLIT_EXPENSES_SHEET, headers: DANG_SPLIT_EXPENSES_HEADERS },
  { sheetName: DANG_SPLIT_ALLOCATIONS_SHEET, headers: DANG_SPLIT_ALLOCATIONS_HEADERS }
]

export type DangSplitGroupWithRow = DangSplitGroup & { rowNumber: number }

/** ردیف‌های دارای شناسه، همراه شماره ردیف واقعی شیت */
export function mapSheetRows<T>(
  rows: string[][],
  mapRow: (row: string[], rowNumber: number) => T
): T[] {
  return rows
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(({ row }) => String(row[0] ?? '').trim())
    .map(({ row, rowNumber }) => mapRow(row, rowNumber))
}

export function nowTimestamp(): string {
  return new Date().toLocaleString('fa-IR')
}

const repairedHeaders = new Set<string>()

/**
 * ستون‌هایی که بعد از ساخته‌شدن شیت اضافه شده‌اند. `ensureSheetWithHeaders` سربرگ
 * موجود را دست نمی‌زند، پس یک‌بار در هر نشست سربرگ کوتاه را کامل می‌کنیم.
 */
export async function repairDangSplitHeaders(
  spreadsheetId: string,
  sheetName: string,
  headers: string[],
  rebuildRows: (rows: string[][]) => string[][]
): Promise<void> {
  const key = `${spreadsheetId}:${sheetName}`

  if (repairedHeaders.has(key)) return

  repairedHeaders.add(key)

  try {
    const headerRows = await fetchSheetRangeFromApi(spreadsheetId, sheetName, '1:1')
    const header = headerRows[0] ?? []

    if (header.length === 0 || header.length >= headers.length) return

    const rows = await fetchSheetRows(spreadsheetId, sheetName)

    await replaceSheetDataRows(spreadsheetId, sheetName, rebuildRows(rows), headers.length, headers)
  } catch {
    // تکمیل سربرگ بهترین‌تلاش است؛ خواندن داده نباید به‌خاطرش شکست بخورد.
    repairedHeaders.delete(key)
  }
}

function rowToGroup(row: string[], rowNumber: number): DangSplitGroupWithRow {
  return {
    rowNumber,
    id: row[0] ?? '',
    createdAt: row[1] ?? '',
    title: row[2] ?? '',
    description: row[3] ?? ''
  }
}

function groupToRow(group: DangSplitGroup): string[] {
  return [group.id, group.createdAt, group.title, group.description]
}

export async function ensureDangSplitSheets(spreadsheetId: string): Promise<void> {
  await ensureManySheetsWithHeaders(spreadsheetId, DANG_SPLIT_SHEET_SPECS)
}

export async function fetchDangSplitGroups(
  spreadsheetId: string
): Promise<DangSplitGroupWithRow[]> {
  const rows = await fetchSheetRows(spreadsheetId, DANG_SPLIT_GROUPS_SHEET)

  return mapSheetRows(rows, rowToGroup).sort((a, b) =>
    (b.createdAt || '').localeCompare(a.createdAt || '', 'fa')
  )
}

export async function createDangSplitGroup(
  spreadsheetId: string,
  data: { title: string; description: string }
): Promise<DangSplitGroup> {
  const group: DangSplitGroup = {
    id: crypto.randomUUID(),
    createdAt: nowTimestamp(),
    title: data.title,
    description: data.description
  }

  await appendSheetRow(spreadsheetId, DANG_SPLIT_GROUPS_SHEET, groupToRow(group))

  return group
}

export async function updateDangSplitGroup(
  spreadsheetId: string,
  rowNumber: number,
  group: DangSplitGroup
): Promise<void> {
  await updateSheetRow(spreadsheetId, DANG_SPLIT_GROUPS_SHEET, rowNumber, groupToRow(group))
}

export async function deleteDangSplitGroup(
  spreadsheetId: string,
  rowNumber: number
): Promise<void> {
  await deleteSheetRow(spreadsheetId, DANG_SPLIT_GROUPS_SHEET, rowNumber)
}
