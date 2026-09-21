import type { AppSettings, CustomForm, WalletAccount } from '../types'
import { exportSheetCsv, importSheetCsv, newImportId, newImportTimestamp } from './importExport'
import { resolveOpeningBalanceContext, syncDerivedOpeningBalances } from './openingBalanceService'
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

export const WALLET_HEADERS = [
  'شناسه',
  'زمان ثبت',
  'عنوان',
  'موجودی',
  'توضیحات',
  'نوع حساب',
  'بانک',
  'شماره کارت',
  'نام دارنده',
  'رنگ کارت',
  'رنگ اصلی',
  'رنگ ثانویه',
  'شماره حساب',
  'شماره شبا'
]

function parseAccountKind(value: string): WalletAccount['accountKind'] {
  if (value === 'bank' || value === 'cash' || value === 'other') return value

  return ''
}

function rowToAccount(row: string[], rowNumber: number): WalletAccount & { rowNumber: number } {
  return {
    rowNumber,
    id: row[0] ?? '',
    createdAt: row[1] ?? '',
    title: row[2] ?? '',
    balance: Number(row[3]) || 0,
    note: row[4] ?? '',
    accountKind: parseAccountKind(row[5] ?? ''),
    bankId: row[6] ?? '',
    cardNumber: row[7] ?? '',
    cardHolder: row[8] ?? '',
    cardColor: row[9] ?? '',
    cardColorPrimary: row[10] ?? '',
    cardColorSecondary: row[11] ?? '',
    accountNumber: row[12] ?? '',
    iban: row[13] ?? ''
  }
}

function accountToRow(account: WalletAccount): string[] {
  return [
    account.id,
    account.createdAt,
    account.title,
    String(account.balance),
    account.note,
    account.accountKind,
    account.bankId,
    account.cardNumber,
    account.cardHolder,
    account.cardColor,
    account.cardColorPrimary,
    account.cardColorSecondary,
    account.accountNumber,
    account.iban
  ]
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

export type WalletAccountInput = {
  title: string
  balance: number
  note: string
  accountKind: WalletAccount['accountKind']
  bankId: string
  cardNumber: string
  cardHolder: string
  cardColor: string
  cardColorPrimary: string
  cardColorSecondary: string
  accountNumber: string
  iban: string
}

export async function createWalletAccount(
  spreadsheetId: string,
  data: WalletAccountInput
): Promise<WalletAccount> {
  const account: WalletAccount = {
    id: crypto.randomUUID(),
    createdAt: new Date().toLocaleString('fa-IR'),
    title: data.title,
    balance: data.balance,
    note: data.note,
    accountKind: data.accountKind,
    bankId: data.bankId,
    cardNumber: data.cardNumber,
    cardHolder: data.cardHolder,
    cardColor: data.cardColor,
    cardColorPrimary: data.cardColorPrimary,
    cardColorSecondary: data.cardColorSecondary,
    accountNumber: data.accountNumber,
    iban: data.iban
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
  /** Month the automatic chain starts from; its opening balance is not derived. */
  anchorMonthKey: string
}

function getDateFieldId(form: CustomForm | undefined): string {
  return form?.fields.find(f => f.type === 'date')?.id ?? 'date'
}

export async function loadWalletPeriodFlow(settings: AppSettings): Promise<WalletPeriodFlow> {
  const range = getDateRange('month-to-date')

  const monthKey = getJalaliMonthKey(range.start)

  const incomeForm = settings.forms.find(f => f.type === 'income')

  const expenseForm = settings.forms.find(f => f.type === 'expense')

  const [incomeRecords, expenseRecords, accounts] = await Promise.all([
    incomeForm ? fetchRecords(settings.spreadsheetId, incomeForm) : Promise.resolve([]),
    expenseForm ? fetchRecords(settings.spreadsheetId, expenseForm) : Promise.resolve([]),
    fetchWalletAccounts(settings.spreadsheetId).catch(() => [])
  ])

  const incomeDateField = getDateFieldId(incomeForm)

  const expenseDateField = getDateFieldId(expenseForm)

  const context = await resolveOpeningBalanceContext({
    spreadsheetId: settings.spreadsheetId,
    incomeRecords,
    expenseRecords,
    incomeDateField,
    expenseDateField,
    walletTotal: accounts.reduce((sum, account) => sum + account.balance, 0),
    currentMonthKey: monthKey
  })

  void syncDerivedOpeningBalances(settings.spreadsheetId, context).catch(() => {
    /* cache mirror only — derived values stay correct without it */
  })

  const totalIncome = incomeRecords
    .filter(r => isDateInRange(r.values[incomeDateField] ?? '', range))
    .reduce((s, r) => s + (Number(r.values.amount) || 0), 0)

  const totalExpense = expenseRecords
    .filter(r => isDateInRange(r.values[expenseDateField] ?? '', range))
    .reduce((s, r) => s + (Number(r.values.amount) || 0), 0)

  return {
    openingBalance: context.openings.get(monthKey) ?? context.anchorAmount,
    totalIncome,
    totalExpense,
    monthKey,
    monthLabel: formatJalaliMonthLabel(monthKey),
    anchorMonthKey: context.anchorMonthKey
  }
}

export async function exportWalletAccountsCsv(spreadsheetId: string): Promise<void> {
  await exportSheetCsv(spreadsheetId, WALLET_SHEET, WALLET_HEADERS, 'کیف-پول.csv')
}

export async function exportWalletAccountsPdf(spreadsheetId: string): Promise<void> {
  const accounts = await fetchWalletAccounts(spreadsheetId)

  const headers = ['عنوان', 'موجودی', 'نوع', 'بانک', 'شماره کارت', 'توضیحات']

  const rows = accounts.map(account => [
    account.title,
    formatMoney(account.balance),
    account.accountKind || '—',
    account.bankId || '—',
    account.cardNumber ? `****${account.cardNumber.slice(-4)}` : '—',
    account.note
  ])

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
      note: cells[4] ?? '',
      accountKind: parseAccountKind(cells[5] ?? ''),
      bankId: cells[6] ?? '',
      cardNumber: cells[7] ?? '',
      cardHolder: cells[8] ?? '',
      cardColor: cells[9] ?? '',
      cardColorPrimary: cells[10] ?? '',
      cardColorSecondary: cells[11] ?? '',
      accountNumber: cells[12] ?? '',
      iban: cells[13] ?? ''
    })
  })
}
