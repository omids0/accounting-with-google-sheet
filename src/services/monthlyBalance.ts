import { MONTHLY_BALANCE_HEADERS } from './sheetHeaders'
import { MONTHLY_BALANCE_SHEET } from './sheetNames'
import { appendSheetRow, ensureSheetWithHeaders, fetchSheetRows, updateSheetRow } from './sheets'
import type { SheetWriteOptions } from './sheetsRows'
import { parseNumeric } from '../utils/parseNumeric'

export { MONTHLY_BALANCE_SHEET, MONTHLY_BALANCE_HEADERS }

export interface MonthlyOpeningBalance {
  monthKey: string
  amount: number
  updatedAt: string
  note: string
  rowNumber?: number
}

function rowToBalance(
  row: string[],
  rowNumber: number
): MonthlyOpeningBalance & { rowNumber: number } {
  return {
    rowNumber,
    monthKey: row[0] ?? '',
    amount: parseNumeric(row[1]),
    updatedAt: row[2] ?? '',
    note: row[3] ?? ''
  }
}

function balanceToRow(balance: MonthlyOpeningBalance): string[] {
  return [balance.monthKey, String(balance.amount), balance.updatedAt, balance.note]
}

export async function ensureMonthlyBalanceSheet(spreadsheetId: string): Promise<void> {
  await ensureSheetWithHeaders(spreadsheetId, MONTHLY_BALANCE_SHEET, MONTHLY_BALANCE_HEADERS)
}

/** One row per month: when a month is listed twice, the row lowest in the sheet (the latest write) wins. */
export function dedupeOpeningBalances<T extends MonthlyOpeningBalance & { rowNumber: number }>(
  items: T[]
): T[] {
  const byMonth = new Map<string, T>()

  for (const item of items) {
    const monthKey = item.monthKey.trim()
    const kept = byMonth.get(monthKey)

    if (!kept || item.rowNumber > kept.rowNumber) byMonth.set(monthKey, { ...item, monthKey })
  }

  return [...byMonth.values()]
}

async function readOpeningBalances(
  spreadsheetId: string
): Promise<(MonthlyOpeningBalance & { rowNumber: number })[]> {
  const rows = await fetchSheetRows(spreadsheetId, MONTHLY_BALANCE_SHEET)

  return dedupeOpeningBalances(
    rows
      .map((row, index) => ({ row, rowNumber: index + 2 }))
      .filter(({ row }) => String(row[0] ?? '').trim())
      .map(({ row, rowNumber }) => rowToBalance(row, rowNumber))
  )
}

export async function fetchOpeningBalance(
  spreadsheetId: string,
  monthKey: string
): Promise<MonthlyOpeningBalance> {
  const found = (await readOpeningBalances(spreadsheetId)).find(item => item.monthKey === monthKey)

  return found ?? { monthKey, amount: 0, updatedAt: '', note: '' }
}

export async function fetchAllOpeningBalances(
  spreadsheetId: string
): Promise<(MonthlyOpeningBalance & { rowNumber: number })[]> {
  await ensureMonthlyBalanceSheet(spreadsheetId)

  return (await readOpeningBalances(spreadsheetId)).sort((a, b) =>
    b.monthKey.localeCompare(a.monthKey)
  )
}

/**
 * The read-then-write of one month must not interleave with another writer of the same sheet
 * (wallet, dashboard and the anchor adoption all start it): both would see no row and append.
 */
const writeQueues = new Map<string, Promise<unknown>>()

function serialized<T>(spreadsheetId: string, task: () => Promise<T>): Promise<T> {
  const run = (writeQueues.get(spreadsheetId) ?? Promise.resolve()).then(task, task)

  writeQueues.set(
    spreadsheetId,
    run.catch(() => undefined)
  )

  return run
}

export function setOpeningBalance(
  spreadsheetId: string,
  monthKey: string,
  amount: number,
  note = '',
  options?: SheetWriteOptions
): Promise<MonthlyOpeningBalance> {
  return serialized(spreadsheetId, async () => {
    await ensureMonthlyBalanceSheet(spreadsheetId)

    const existing = await fetchOpeningBalance(spreadsheetId, monthKey)

    // Same amount and note: nothing to write, and the stamp of the first calculation stays.
    if (existing.rowNumber && existing.amount === amount && existing.note === note) return existing

    const balance: MonthlyOpeningBalance = {
      monthKey,
      amount,
      updatedAt: new Date().toLocaleString('fa-IR'),
      note
    }

    if (existing.rowNumber) {
      await updateSheetRow(
        spreadsheetId,
        MONTHLY_BALANCE_SHEET,
        existing.rowNumber,
        balanceToRow(balance),
        options
      )
    } else {
      await appendSheetRow(spreadsheetId, MONTHLY_BALANCE_SHEET, balanceToRow(balance), options)
    }

    return balance
  })
}

export const DERIVED_OPENING_BALANCE_NOTE = 'محاسبه خودکار از مانده پایان ماه قبل'
