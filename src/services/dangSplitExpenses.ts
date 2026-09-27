import {
  DANG_SPLIT_ALLOCATIONS_HEADERS,
  DANG_SPLIT_ALLOCATIONS_SHEET,
  DANG_SPLIT_EXPENSES_HEADERS,
  DANG_SPLIT_EXPENSES_SHEET,
  mapSheetRows,
  nowTimestamp
} from './dangSplit'
import type { DangSplitWeight } from './dangSplitMath'
import {
  appendSheetRow,
  deleteSheetRow,
  fetchSheetRangeFromApi,
  fetchSheetRows,
  replaceSheetDataRows,
  updateSheetRow
} from './sheets'
import type { DangSplitAllocation, DangSplitExpense } from '../types/dangSplit'
import { parseNumeric } from '../utils/parseNumeric'

export type DangSplitExpenseWithRow = DangSplitExpense & { rowNumber: number }
export type DangSplitAllocationWithRow = DangSplitAllocation & { rowNumber: number }

function rowToExpense(row: string[], rowNumber: number): DangSplitExpenseWithRow {
  return {
    rowNumber,
    id: row[0] ?? '',
    groupId: row[1] ?? '',
    title: row[2] ?? '',
    date: row[3] ?? '',
    amount: parseNumeric(row[4]),
    note: row[5] ?? '',
    createdAt: row[6] ?? '',
    payerId: row[7] ?? ''
  }
}

export function expenseToRow(expense: DangSplitExpense): string[] {
  return [
    expense.id,
    expense.groupId,
    expense.title,
    expense.date,
    String(expense.amount),
    expense.note,
    expense.createdAt,
    expense.payerId
  ]
}

function rowToAllocation(row: string[], rowNumber: number): DangSplitAllocationWithRow {
  return {
    rowNumber,
    id: row[0] ?? '',
    groupId: row[1] ?? '',
    expenseId: row[2] ?? '',
    personId: row[3] ?? '',
    weight: parseNumeric(row[4])
  }
}

export function allocationToRow(allocation: DangSplitAllocation): string[] {
  return [
    allocation.id,
    allocation.groupId,
    allocation.expenseId,
    allocation.personId,
    String(allocation.weight)
  ]
}

const repairedHeaders = new Set<string>()

/**
 * ستون «پرداخت‌کننده» بعد از ساخته‌شدن شیت اضافه شد و `ensureSheetWithHeaders` سربرگ
 * موجود را دست نمی‌زند، پس یک‌بار در هر نشست سربرگ کوتاه را کامل می‌کنیم.
 */
async function repairExpenseHeaders(spreadsheetId: string): Promise<void> {
  if (repairedHeaders.has(spreadsheetId)) return

  repairedHeaders.add(spreadsheetId)

  try {
    const headerRows = await fetchSheetRangeFromApi(
      spreadsheetId,
      DANG_SPLIT_EXPENSES_SHEET,
      'A1:Z1'
    )
    const header = headerRows[0] ?? []

    if (header.length === 0 || header.length >= DANG_SPLIT_EXPENSES_HEADERS.length) return

    const rows = await fetchSheetRows(spreadsheetId, DANG_SPLIT_EXPENSES_SHEET)

    await replaceSheetDataRows(
      spreadsheetId,
      DANG_SPLIT_EXPENSES_SHEET,
      mapSheetRows(rows, rowToExpense).map(expenseToRow),
      DANG_SPLIT_EXPENSES_HEADERS.length,
      DANG_SPLIT_EXPENSES_HEADERS
    )
  } catch {
    // تکمیل سربرگ بهترین‌تلاش است؛ خواندن اقلام نباید به‌خاطرش شکست بخورد.
    repairedHeaders.delete(spreadsheetId)
  }
}

export async function fetchDangSplitExpenses(
  spreadsheetId: string,
  groupId?: string
): Promise<DangSplitExpenseWithRow[]> {
  await repairExpenseHeaders(spreadsheetId)

  const rows = await fetchSheetRows(spreadsheetId, DANG_SPLIT_EXPENSES_SHEET)

  return mapSheetRows(rows, rowToExpense)
    .filter(item => !groupId || item.groupId === groupId)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
}

export async function createDangSplitExpense(
  spreadsheetId: string,
  data: {
    groupId: string
    title: string
    date: string
    amount: number
    note: string
    payerId: string
  }
): Promise<DangSplitExpense> {
  const expense: DangSplitExpense = {
    id: crypto.randomUUID(),
    groupId: data.groupId,
    title: data.title,
    date: data.date,
    amount: data.amount,
    note: data.note,
    payerId: data.payerId,
    createdAt: nowTimestamp()
  }

  await appendSheetRow(spreadsheetId, DANG_SPLIT_EXPENSES_SHEET, expenseToRow(expense))

  return expense
}

export async function updateDangSplitExpense(
  spreadsheetId: string,
  rowNumber: number,
  expense: DangSplitExpense
): Promise<void> {
  await updateSheetRow(spreadsheetId, DANG_SPLIT_EXPENSES_SHEET, rowNumber, expenseToRow(expense))
}

export async function deleteDangSplitExpense(
  spreadsheetId: string,
  rowNumber: number
): Promise<void> {
  await deleteSheetRow(spreadsheetId, DANG_SPLIT_EXPENSES_SHEET, rowNumber)
}

export async function fetchDangSplitAllocations(
  spreadsheetId: string,
  groupId?: string
): Promise<DangSplitAllocationWithRow[]> {
  const rows = await fetchSheetRows(spreadsheetId, DANG_SPLIT_ALLOCATIONS_SHEET)

  return mapSheetRows(rows, rowToAllocation).filter(item => !groupId || item.groupId === groupId)
}

/**
 * جایگزینی کامل تخصیص‌های یک قلم هزینه. تخصیص‌های بقیه اقلام دست‌نخورده می‌مانند و کل
 * شیت یک‌بار بازنویسی می‌شود تا برای هر نفر یک درخواست جدا نرود.
 */
export async function replaceDangSplitAllocations(
  spreadsheetId: string,
  {
    groupId,
    expenseId,
    weights
  }: {
    groupId: string
    expenseId: string
    weights: DangSplitWeight[]
  }
): Promise<void> {
  const existing = await fetchDangSplitAllocations(spreadsheetId)
  const kept = existing.filter(item => item.expenseId !== expenseId)
  const next: DangSplitAllocation[] = weights.map(item => ({
    id: crypto.randomUUID(),
    groupId,
    expenseId,
    personId: item.personId,
    weight: item.weight
  }))

  await replaceSheetDataRows(
    spreadsheetId,
    DANG_SPLIT_ALLOCATIONS_SHEET,
    [...kept, ...next].map(allocationToRow),
    DANG_SPLIT_ALLOCATIONS_HEADERS.length,
    DANG_SPLIT_ALLOCATIONS_HEADERS
  )
}
