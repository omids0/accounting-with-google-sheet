import { exportSheetCsv, importSheetCsv, newImportId, newImportTimestamp } from './importExport'
import { fetchReceivables } from './receivablesCrud'
import { validateReceivablesCsvCells } from './receivablesCsvValidate'
import {
  RECEIVABLES_HEADERS,
  RECEIVABLES_SHEET,
  parsePayments,
  receivableToRow,
  sortReceivables
} from './receivablesRow'
import { formatMoney } from '../utils/formatMoney'
import { withoutRecordIds } from '../utils/importRecordIds'
import { downloadTablePdf } from '../utils/pdf'
import {
  formatReceivablePayments,
  formatReceivableSummary,
  formatPersianDate
} from '../utils/pdfFormat'

export async function exportReceivablesCsv(spreadsheetId: string): Promise<string | null> {
  return exportSheetCsv(spreadsheetId, RECEIVABLES_SHEET, RECEIVABLES_HEADERS, 'طلب‌ها.csv')
}

export async function exportReceivablesPdf(spreadsheetId: string): Promise<string | null> {
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

  return downloadTablePdf({
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
      const { title, debtor, category, amount, borrowDate } = validateReceivablesCsvCells(cells)

      return receivableToRow({
        id: newImportId(cells[0] ?? ''),
        createdAt: newImportTimestamp(cells[1] ?? ''),
        title,
        debtor,
        category,
        amount,
        borrowDate,
        note: cells[7] ?? '',
        payments: withoutRecordIds(parsePayments(cells[8] ?? ''))
      })
    }
  )
}
