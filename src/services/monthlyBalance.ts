import { appendSheetRow, ensureSheetWithHeaders, fetchSheetRows, updateSheetRow } from './sheets'
import { getDateRange, getJalaliMonthKey } from '../utils/dateRange'

export const MONTHLY_BALANCE_SHEET = 'موجودی ماهانه'

export const MONTHLY_BALANCE_HEADERS = ['کلید ماه', 'موجودی اول', 'زمان ثبت', 'توضیحات']

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
    amount: Number(row[1]) || 0,
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

export async function fetchOpeningBalance(
  spreadsheetId: string,
  monthKey: string
): Promise<MonthlyOpeningBalance> {
  const rows = await fetchSheetRows(spreadsheetId, MONTHLY_BALANCE_SHEET)

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]

    if (String(row[0] ?? '').trim() === monthKey) {
      return rowToBalance(row, i + 2)
    }
  }

  return { monthKey, amount: 0, updatedAt: '', note: '' }
}

export async function fetchAllOpeningBalances(
  spreadsheetId: string
): Promise<(MonthlyOpeningBalance & { rowNumber: number })[]> {
  await ensureMonthlyBalanceSheet(spreadsheetId)

  const rows = await fetchSheetRows(spreadsheetId, MONTHLY_BALANCE_SHEET)

  return rows
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(({ row }) => String(row[0] ?? '').trim())
    .map(({ row, rowNumber }) => rowToBalance(row, rowNumber))
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey))
}

export async function setOpeningBalance(
  spreadsheetId: string,
  monthKey: string,
  amount: number,
  note = ''
): Promise<MonthlyOpeningBalance> {
  await ensureMonthlyBalanceSheet(spreadsheetId)

  const existing = await fetchOpeningBalance(spreadsheetId, monthKey)

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
      balanceToRow(balance)
    )
  } else {
    await appendSheetRow(spreadsheetId, MONTHLY_BALANCE_SHEET, balanceToRow(balance))
  }

  return balance
}

export function monthKeyFromRangeStart(rangeStart: string): string {
  return getJalaliMonthKey(rangeStart)
}

export const AUTO_OPENING_BALANCE_NOTE = 'ثبت خودکار از مجموع کیف پول'

export function hasUserOpeningBalance(balance: MonthlyOpeningBalance): boolean {
  return balance.rowNumber != null
}

export async function ensureAutoOpeningBalanceForCurrentMonth(
  spreadsheetId: string,
  walletTotal: number
): Promise<MonthlyOpeningBalance | null> {
  await ensureMonthlyBalanceSheet(spreadsheetId)

  const monthKey = getJalaliMonthKey(getDateRange('month-to-date').start)

  const existing = await fetchOpeningBalance(spreadsheetId, monthKey)

  if (hasUserOpeningBalance(existing)) {
    return null
  }

  return setOpeningBalance(spreadsheetId, monthKey, walletTotal, AUTO_OPENING_BALANCE_NOTE)
}
