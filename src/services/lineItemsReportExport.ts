import type { ItemStat } from './lineItemsReport'
import { downloadTextFile, rowsToCsv } from '../utils/csv'
import { formatMoney } from '../utils/formatMoney'
import { downloadTablePdf } from '../utils/pdf'

const HEADERS = ['قلم', 'دفعات', 'میانگین', 'جمع', 'دسته']

export function lineItemsReportRows(items: ItemStat[]): string[][] {
  return items.map(item => [
    item.name,
    item.count.toLocaleString('fa-IR'),
    formatMoney(Math.round(item.average)),
    formatMoney(item.total),
    item.topCategory
  ])
}

export function exportLineItemsCsv(items: ItemStat[]): Promise<string | null> {
  return downloadTextFile('گزارش-اقلام.csv', rowsToCsv(HEADERS, lineItemsReportRows(items)))
}

export async function exportLineItemsPdf(items: ItemStat[]): Promise<string | null> {
  const rows = lineItemsReportRows(items)

  return downloadTablePdf({
    title: 'گزارش اقلام',
    headers: HEADERS,
    rows,
    filename: 'گزارش-اقلام.pdf',
    cellClasses: rows.map(() => ['', '', 'pdf-cell-amount', 'pdf-cell-amount', ''])
  })
}
