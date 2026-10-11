import type { LedgerEntry } from './walletLedger'
import { downloadTextFile, rowsToCsv } from '../utils/csv'
import { formatMoney } from '../utils/formatMoney'
import { formatIsoDatePersian } from '../utils/jalaliDate'
import { downloadTablePdf } from '../utils/pdf'

const HEADERS = ['تاریخ', 'عنوان', 'منبع', 'مبلغ', 'موجودی بعد', 'اثر']

/** Raw values (CSV); the PDF formats dates and amounts for reading. */
export function ledgerTable(entries: LedgerEntry[]): { headers: string[]; rows: string[][] } {
  return {
    headers: HEADERS,
    rows: entries.map(entry => [
      entry.date,
      entry.title,
      entry.source,
      String(entry.delta),
      String(entry.balanceAfter),
      entry.applied ? 'بله' : 'بدون اثر'
    ])
  }
}

function fileName(accountTitle: string, extension: string): string {
  return `گردش-${accountTitle.trim().replace(/\s+/g, '-') || 'حساب'}.${extension}`
}

export function exportLedgerCsv(accountTitle: string, entries: LedgerEntry[]): void {
  const { headers, rows } = ledgerTable(entries)

  downloadTextFile(fileName(accountTitle, 'csv'), rowsToCsv(headers, rows))
}

export async function exportLedgerPdf(accountTitle: string, entries: LedgerEntry[]): Promise<void> {
  const { headers, rows } = ledgerTable(entries)

  await downloadTablePdf({
    title: `گردش حساب ${accountTitle}`,
    headers,
    rows: rows.map((row, index) => [
      entries[index].date ? formatIsoDatePersian(entries[index].date) : '—',
      row[1],
      row[2],
      formatMoney(entries[index].delta),
      formatMoney(entries[index].balanceAfter),
      row[5]
    ]),
    filename: fileName(accountTitle, 'pdf'),
    cellClasses: rows.map(() => ['', '', '', 'pdf-cell-amount', 'pdf-cell-amount', ''])
  })
}
