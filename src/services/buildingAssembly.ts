import type { FlowSide } from './buildingDashboard'
import type { ManagedItem } from './buildingLists'
import {
  collectionByMonth,
  collectionRate,
  debtorTable,
  fundBalanceSeries,
  openDebts,
  periodFlow,
  type CollectionMonth,
  type DebtorTable,
  type FundPoint,
  type OpenDebts,
  type PeriodFlow,
  type PeriodWindow
} from './buildingReports'
import type { LedgerEntry } from './walletLedger'
import type { UnitRowData } from '../components/buildings/unitRows'
import type { Dang, Receivable, WalletAccount } from '../types'
import { downloadTextFile, rowsToCsv } from '../utils/csv'
import { formatMoney, formatPersianNumber } from '../utils/formatMoney'
import { toPersianDigits } from '../utils/normalizeDigits'
import { downloadTablePdf } from '../utils/pdf'

export interface BuildingReport {
  /** «گزارش مجمع ۱۴۰۵». */
  title: string
  window: PeriodWindow
  flow: PeriodFlow
  collection: CollectionMonth[]
  /** Percent of the billed charges collected; null when nothing was billed. */
  rate: number | null
  debtors: DebtorTable
  fund: {
    accounts: { id: string; title: string; balance: number }[]
    total: number
    series: FundPoint[]
  }
  debts: OpenDebts
}

export interface BuildingReportInput {
  window: PeriodWindow
  income: FlowSide
  expense: FlowSide
  kinds: ManagedItem[]
  payers: ManagedItem[]
  receivables: Receivable[]
  unitRows: UnitRowData[]
  accounts: Pick<WalletAccount, 'id' | 'title' | 'balance'>[]
  /** The wallet ledger, oldest first. */
  ledger: LedgerEntry[]
  dangs: Dang[]
  managerNames: string[]
}

/**
 * Everything the reports page and «گزارش مجمع» show, from one set of loaded sheets. Transfers
 * and fund corrections are not income or spending, and unit credit is not a receivable owed.
 */
export function buildBuildingReport(input: BuildingReportInput): BuildingReport {
  const { window } = input

  const collection = collectionByMonth(input.receivables, window.monthKeys)

  return {
    title: `گزارش مجمع ${window.title}`,
    window,
    flow: periodFlow(input.income, input.expense, window.range, input.kinds, input.payers),
    collection,
    rate: collectionRate(collection),
    debtors: debtorTable(input.unitRows, input.receivables),
    fund: {
      accounts: input.accounts.map(({ id, title, balance }) => ({ id, title, balance })),
      total: input.accounts.reduce((sum, account) => sum + account.balance, 0),
      series: fundBalanceSeries(
        input.ledger,
        input.accounts.map(account => account.id),
        window.monthKeys
      )
    },
    debts: openDebts(input.dangs, input.managerNames)
  }
}

export const ASSEMBLY_HEADERS = ['بخش', 'عنوان', 'مبلغ', 'توضیح']

const percent = (value: number) => `${formatPersianNumber(value)}٪`

const count = (value: number) => toPersianDigits(String(value))

function sharePercent(amount: number, total: number): string {
  return total ? percent(Math.round((amount / total) * 100)) : ''
}

/** The rows of the CSV and the PDF: one flat table, a section name on each row. */
export function assemblyRows(report: BuildingReport): string[][] {
  const { flow, debtors, fund, debts } = report

  const rows: string[][] = [
    ['خلاصه', 'وصول', formatMoney(flow.income), ''],
    ['خلاصه', 'هزینه', formatMoney(flow.expense), ''],
    ['خلاصه', 'وصول − هزینه', formatMoney(flow.income - flow.expense), '']
  ]

  for (const month of report.collection.filter(item => item.billed || item.collected)) {
    rows.push([
      'صدور و وصول',
      month.label,
      formatMoney(month.billed),
      `وصول ${formatMoney(month.collected)}${
        month.billed ? ` · ${sharePercent(month.collected, month.billed)}` : ''
      }`
    ])
  }

  for (const item of flow.byCategory) {
    rows.push([
      'هزینه به تفکیک دسته',
      item.name,
      formatMoney(item.total),
      sharePercent(item.total, flow.expense)
    ])
  }

  for (const item of flow.byKind) {
    rows.push([
      'هزینه به تفکیک نوع',
      item.label,
      formatMoney(item.amount),
      sharePercent(item.amount, flow.expense)
    ])
  }

  for (const row of debtors.rows) {
    rows.push([
      'بدهکاران',
      `واحد ${toPersianDigits(row.unitNumber)} · ${row.name}`,
      formatMoney(row.amount),
      [row.months.join('، '), row.credit ? `اعتبار ${formatMoney(row.credit)}` : '']
        .filter(Boolean)
        .join(' · ')
    ])
  }

  if (debtors.rows.length) {
    rows.push(['بدهکاران', 'جمع', formatMoney(debtors.total), `${count(debtors.rows.length)} واحد`])
  }

  if (debtors.credit) rows.push(['اعتبار واحدها', 'جمع', formatMoney(debtors.credit), ''])

  if (debts.manager) rows.push(['بدهی ساختمان', 'به مدیر', formatMoney(debts.manager), ''])

  for (const item of debts.contractors) {
    rows.push(['بدهی ساختمان', item.name, formatMoney(item.amount), 'پیمانکار یا عضو'])
  }

  for (const account of fund.accounts) {
    rows.push(['صندوق', account.title, formatMoney(account.balance), ''])
  }

  rows.push(['صندوق', 'جمع موجودی', formatMoney(fund.total), ''])

  return rows
}

const fileNameOf = (report: BuildingReport) => report.title.replace(/\s+/g, '-')

export function exportAssemblyCsv(report: BuildingReport): Promise<string | null> {
  return downloadTextFile(
    `${fileNameOf(report)}.csv`,
    rowsToCsv(ASSEMBLY_HEADERS, assemblyRows(report))
  )
}

export function exportAssemblyPdf(report: BuildingReport): Promise<string | null> {
  const rows = assemblyRows(report)

  return downloadTablePdf({
    title: report.title,
    headers: ASSEMBLY_HEADERS,
    rows,
    filename: `${fileNameOf(report)}.pdf`,
    cellClasses: rows.map(() => ['', '', 'pdf-cell-amount', ''])
  })
}
