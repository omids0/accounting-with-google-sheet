import type { AppSettings, CustomForm, WalletAccount } from '../types'
import { exportSheetCsv, importSheetCsv, newImportId, newImportTimestamp } from './importExport'
import { fetchOpeningBalance } from './monthlyBalance'
import {
  appendSheetRow,
  ensureSheetWithHeaders,
  fetchRecords,
  fetchSheetRows,
  updateSheetRow,
  deleteSheetRow
} from './sheets'
import {
  formatJalaliMonthLabel,
  getDateRange,
  getJalaliMonthKey,
  isDateInRange
} from '../utils/dateRange'
import { formatMoney } from '../utils/formatMoney'
import { downloadTablePdf } from '../utils/pdf'

export const WALLET_SHEET = 'کیف پول'

export const WALLET_HEADERS = ['شناسه', 'زمان ثبت', 'عنوان', 'موجودی', 'توضیحات']

function rowToAccount(row: string[], rowNumber: number): WalletAccount & { rowNumber: number } {
  return {
    rowNumber,
    id: row[0] ?? '',
    createdAt: row[1] ?? '',
    title: row[2] ?? '',
    balance: Number(row[3]) || 0,
    note: row[4] ?? ''
  }
}

function accountToRow(account: WalletAccount): string[] {
  return [account.id, account.createdAt, account.title, String(account.balance), account.note]
}

export async function ensureWalletSheet(spreadsheetId: string): Promise<void> {
  await ensureSheetWithHeaders(spreadsheetId, WALLET_SHEET, WALLET_HEADERS)
}

export async function fetchWalletAccounts(
  spreadsheetId: string
): Promise<(WalletAccount & { rowNumber: number })[]> {
  const rows = await fetchSheetRows(spreadsheetId, WALLET_SHEET)

  return rows
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(({ row }) => String(row[0] ?? '').trim())
    .map(({ row, rowNumber }) => rowToAccount(row, rowNumber))
    .sort((a, b) => b.balance - a.balance)
}

export async function createWalletAccount(
  spreadsheetId: string,
  data: { title: string; balance: number; note: string }
): Promise<WalletAccount> {
  const account: WalletAccount = {
    id: crypto.randomUUID(),
    createdAt: new Date().toLocaleString('fa-IR'),
    title: data.title,
    balance: data.balance,
    note: data.note
  }

  await appendSheetRow(spreadsheetId, WALLET_SHEET, accountToRow(account))

  return account
}

export async function updateWalletAccount(
  spreadsheetId: string,
  account: WalletAccount & { rowNumber: number }
): Promise<WalletAccount> {
  await updateSheetRow(spreadsheetId, WALLET_SHEET, account.rowNumber, accountToRow(account))

  return account
}

export async function deleteWalletAccount(spreadsheetId: string, rowNumber: number): Promise<void> {
  await deleteSheetRow(spreadsheetId, WALLET_SHEET, rowNumber)
}

export interface WalletPeriodFlow {
  openingBalance: number
  totalIncome: number
  totalExpense: number
  monthKey: string
  monthLabel: string
}

function getDateFieldId(form: CustomForm | undefined): string {
  return form?.fields.find(f => f.type === 'date')?.id ?? 'date'
}

export async function loadWalletPeriodFlow(settings: AppSettings): Promise<WalletPeriodFlow> {
  const range = getDateRange('month-to-date')

  const monthKey = getJalaliMonthKey(range.start)

  const incomeForm = settings.forms.find(f => f.type === 'income')

  const expenseForm = settings.forms.find(f => f.type === 'expense')

  const [incomeRecords, expenseRecords, openingBalanceRecord] = await Promise.all([
    incomeForm ? fetchRecords(settings.spreadsheetId, incomeForm) : Promise.resolve([]),
    expenseForm ? fetchRecords(settings.spreadsheetId, expenseForm) : Promise.resolve([]),
    fetchOpeningBalance(settings.spreadsheetId, monthKey).catch(() => ({
      monthKey,
      amount: 0,
      updatedAt: '',
      note: ''
    }))
  ])

  const incomeDateField = getDateFieldId(incomeForm)

  const expenseDateField = getDateFieldId(expenseForm)

  const totalIncome = incomeRecords
    .filter(r => isDateInRange(r.values[incomeDateField] ?? '', range))
    .reduce((s, r) => s + (Number(r.values.amount) || 0), 0)

  const totalExpense = expenseRecords
    .filter(r => isDateInRange(r.values[expenseDateField] ?? '', range))
    .reduce((s, r) => s + (Number(r.values.amount) || 0), 0)

  return {
    openingBalance: openingBalanceRecord.amount,
    totalIncome,
    totalExpense,
    monthKey,
    monthLabel: formatJalaliMonthLabel(monthKey)
  }
}

export async function exportWalletAccountsCsv(spreadsheetId: string): Promise<void> {
  await exportSheetCsv(spreadsheetId, WALLET_SHEET, WALLET_HEADERS, 'کیف-پول.csv')
}

export async function exportWalletAccountsPdf(spreadsheetId: string): Promise<void> {
  const accounts = await fetchWalletAccounts(spreadsheetId)

  const headers = ['عنوان', 'موجودی', 'توضیحات']

  const rows = accounts.map(account => [account.title, formatMoney(account.balance), account.note])

  const cellClasses = accounts.map(() => ['', 'pdf-cell-amount', ''])

  await downloadTablePdf({
    title: 'گزارش کیف پول',
    headers,
    rows,
    filename: 'کیف-پول.pdf',
    cellClasses
  })
}

export async function importWalletAccountsCsv(spreadsheetId: string, csvContent: string) {
  return importSheetCsv(spreadsheetId, WALLET_SHEET, WALLET_HEADERS, csvContent, cells => {
    const title = (cells[2] ?? '').trim()

    if (!title) return null

    return accountToRow({
      id: newImportId(cells[0] ?? ''),
      createdAt: newImportTimestamp(cells[1] ?? ''),
      title,
      balance: Number(cells[3]) || 0,
      note: cells[4] ?? ''
    })
  })
}
