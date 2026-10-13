import type { CounterpartyStat } from './counterpartiesReport'
import { downloadTextFile, rowsToCsv } from '../utils/csv'
import { formatMoney, formatPersianNumber } from '../utils/formatMoney'
import { downloadTablePdf } from '../utils/pdf'

const HEADERS = ['طرف حساب', 'تراکنش', 'جمع', 'سهم', 'دسته']

export function counterpartiesReportRows(rows: CounterpartyStat[]): string[][] {
  return rows.map(row => [
    row.name,
    row.count.toLocaleString('fa-IR'),
    formatMoney(row.total),
    `${formatPersianNumber(Math.round(row.share * 100))}٪`,
    row.topCategory
  ])
}

export function exportCounterpartiesReportCsv(rows: CounterpartyStat[]): Promise<string | null> {
  return downloadTextFile(
    'گزارش-طرف-حساب‌ها.csv',
    rowsToCsv(HEADERS, counterpartiesReportRows(rows))
  )
}

export async function exportCounterpartiesReportPdf(
  rows: CounterpartyStat[]
): Promise<string | null> {
  const data = counterpartiesReportRows(rows)

  return downloadTablePdf({
    title: 'گزارش طرف حساب‌ها',
    headers: HEADERS,
    rows: data,
    filename: 'گزارش-طرف-حساب‌ها.pdf',
    cellClasses: data.map(() => ['', '', 'pdf-cell-amount', '', ''])
  })
}
