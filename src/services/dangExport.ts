import { validateDangCsvCells } from './dangCsvValidate'
import { dangPaymentsFromCells, dangToRow, fetchDangs, parsePaid, sortDangs } from './dangRow'
import { exportSheetCsv, importSheetCsv, newImportId, newImportTimestamp } from './importExport'
import { DANG_HEADERS } from './sheetHeaders'
import { DANG_SHEET } from './sheetNames'
import { formatMoney } from '../utils/formatMoney'
import { downloadTablePdf } from '../utils/pdf'
import {
  formatPaymentSummary,
  formatPersianDate,
  formatReceivablePayments
} from '../utils/pdfFormat'

export async function exportDangsCsv(spreadsheetId: string): Promise<string | null> {
  return exportSheetCsv(spreadsheetId, DANG_SHEET, DANG_HEADERS, 'بدهی.csv')
}

export async function exportDangsPdf(spreadsheetId: string): Promise<string | null> {
  const items = sortDangs(await fetchDangs(spreadsheetId))

  const headers = [
    'عنوان',
    'دسته‌بندی',
    'طرف حساب',
    'مبلغ',
    'تاریخ',
    'وضعیت',
    'پرداخت شده',
    'مانده',
    'توضیحات',
    'جزئیات پرداخت'
  ]

  const rows = items.map(item => {
    const summary = formatPaymentSummary(item.amount, item.payments)

    const status = item.paid ? 'پرداخت شده' : item.payments.length ? 'پرداخت جزئی' : 'پرداخت نشده'

    return [
      item.title,
      item.category,
      item.counterparty,
      formatMoney(item.amount),
      formatPersianDate(item.date),
      status,
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
    '',
    'pdf-cell-amount',
    'pdf-cell-amount',
    '',
    'pdf-cell-multiline'
  ])

  return downloadTablePdf({
    title: 'گزارش بدهی‌ها',
    headers,
    rows,
    filename: 'بدهی.pdf',
    cellClasses
  })
}

export async function importDangsCsv(spreadsheetId: string, csvContent: string) {
  return importSheetCsv(spreadsheetId, DANG_SHEET, DANG_HEADERS, csvContent, cells => {
    const { title, category, counterparty, amount, date } = validateDangCsvCells(cells)

    const id = newImportId(cells[0] ?? '')

    // The ids of the payments' records belong to the spreadsheet the file came from.
    const payments = dangPaymentsFromCells({
      cell: cells[13],
      paid: parsePaid(cells[8] ?? ''),
      paidAt: cells[9] ?? '',
      transactionRecordId: '',
      amount,
      id
    }).map(({ id: paymentId, amount: paid, paidAt, note }) => ({
      id: paymentId,
      amount: paid,
      paidAt,
      note
    }))

    return dangToRow({
      id,
      createdAt: newImportTimestamp(cells[1] ?? ''),
      title,
      category,
      counterparty,
      amount,
      date,
      note: cells[7] ?? '',
      paid: false,
      paidAt: '',
      subCategory: cells[11] ?? '',
      payments
    })
  })
}
