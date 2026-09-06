import { exportSheetCsv, importSheetCsv, newImportId, newImportTimestamp } from './importExport'
import { fetchReceivables } from './receivablesCrud'
import {
  RECEIVABLES_HEADERS,
  RECEIVABLES_SHEET,
  parsePayments,
  receivableToRow,
  sortReceivables
} from './receivablesRow'
import { formatMoney } from '../utils/formatMoney'
import { downloadTablePdf } from '../utils/pdf'
import {
  formatReceivablePayments,
  formatReceivableSummary,
  formatPersianDate
} from '../utils/pdfFormat'

export async function exportReceivablesCsv(spreadsheetId: string): Promise<void> {
  await exportSheetCsv(spreadsheetId, RECEIVABLES_SHEET, RECEIVABLES_HEADERS, 'طلب‌ها.csv')
}

export async function exportReceivablesPdf(spreadsheetId: string): Promise<void> {
  const items = sortReceivables(await fetchReceivables(spreadsheetId))

  const headers = [
    'عنوان',
    'طرف حساب',
    'دسته‌بندی',
    'مبلغ',
    'تاریخ قرض',
    'پرداخت شده',
    'مانده',
    'توضیحات',
    'جزئیات پرداخت'
  ]

  const rows = items.map(item => {
    const summary = formatReceivableSummary(item)

    return [
      item.title,
      item.debtor,
      item.category,
      formatMoney(item.amount),
      formatPersianDate(item.borrowDate),
      summary.paid,
      summary.remaining,
      item.note,
      formatReceivablePayments(item.payments)
    ]
  })

  const cellClasses = items.map(() => [
    '',
    '',
    '',
    'pdf-cell-amount',
    '',
    'pdf-cell-amount',
    'pdf-cell-amount',
    '',
    'pdf-cell-multiline'
  ])

  await downloadTablePdf({
    title: 'گزارش طلب‌ها',
    headers,
    rows,
    filename: 'طلب‌ها.pdf',
    cellClasses
  })
}

export async function importReceivablesCsv(spreadsheetId: string, csvContent: string) {
  return importSheetCsv(
    spreadsheetId,
    RECEIVABLES_SHEET,
    RECEIVABLES_HEADERS,
    csvContent,
    cells => {
      const debtor = (cells[3] ?? '').trim()

      if (!debtor) return null

      return receivableToRow({
        id: newImportId(cells[0] ?? ''),
        createdAt: newImportTimestamp(cells[1] ?? ''),
        title: cells[2] ?? '',
        debtor,
        category: cells[4] ?? 'سایر',
        amount: Number(cells[5]) || 0,
        borrowDate: cells[6] ?? '',
        note: cells[7] ?? '',
        payments: parsePayments(cells[8] ?? '')
      })
    }
  )
}
