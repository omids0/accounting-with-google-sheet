import { CHECKS_HEADERS, CHECKS_SHEET } from '../services/checks'
import { DANG_HEADERS, DANG_SHEET } from '../services/dang'
import { INSTALLMENTS_HEADERS, INSTALLMENTS_SHEET } from '../services/installments'
import { MONTHLY_BALANCE_HEADERS, MONTHLY_BALANCE_SHEET } from '../services/monthlyBalance'
import { RECEIVABLES_HEADERS, RECEIVABLES_SHEET } from '../services/receivables'
import { getDefaultForms } from '../services/settings'
import { setSheetAllRows } from '../services/spreadsheetStore'
import { TREASURY_HEADERS, TREASURY_SHEET } from '../services/treasury'
import { WALLET_HEADERS, WALLET_SHEET } from '../services/wallet'
import type { AppSettings } from '../types'
import { getDateRange, getJalaliMonthKey } from '../utils/dateRange'

export const TEST_SPREADSHEET_ID = 'test-spreadsheet-id'

export const testSettings: AppSettings = {
  spreadsheetId: TEST_SPREADSHEET_ID,
  spreadsheets: [{ id: TEST_SPREADSHEET_ID, name: 'test', createdAt: '2024-01-01' }],
  forms: getDefaultForms(),
  currency: 'toman',
  theme: 'light'
}

export function seedDashboardSheets(spreadsheetId: string, walletBalance: number): void {
  const monthKey = getJalaliMonthKey(getDateRange('month-to-date').start)

  const incomeForm = testSettings.forms.find(form => form.type === 'income')

  const expenseForm = testSettings.forms.find(form => form.type === 'expense')

  const incomeHeaders = [
    'شناسه',
    'زمان ثبت',
    ...(incomeForm?.fields.map(field => field.label) ?? [])
  ]

  const expenseHeaders = [
    'شناسه',
    'زمان ثبت',
    ...(expenseForm?.fields.map(field => field.label) ?? [])
  ]

  setSheetAllRows(spreadsheetId, incomeForm?.sheetName ?? 'درآمد', [incomeHeaders])
  setSheetAllRows(spreadsheetId, expenseForm?.sheetName ?? 'هزینه', [expenseHeaders])
  setSheetAllRows(spreadsheetId, INSTALLMENTS_SHEET, [INSTALLMENTS_HEADERS])
  setSheetAllRows(spreadsheetId, DANG_SHEET, [DANG_HEADERS])
  setSheetAllRows(spreadsheetId, CHECKS_SHEET, [CHECKS_HEADERS])
  setSheetAllRows(spreadsheetId, RECEIVABLES_SHEET, [RECEIVABLES_HEADERS])
  setSheetAllRows(spreadsheetId, TREASURY_SHEET, [TREASURY_HEADERS])
  setSheetAllRows(spreadsheetId, MONTHLY_BALANCE_SHEET, [
    MONTHLY_BALANCE_HEADERS,
    [monthKey, '0', 'test', '']
  ])
  setSheetAllRows(spreadsheetId, WALLET_SHEET, [
    WALLET_HEADERS,
    ['wallet-1', '2024', 'Main wallet', String(walletBalance), '']
  ])
}
