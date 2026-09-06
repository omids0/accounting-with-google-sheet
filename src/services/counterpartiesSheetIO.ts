import {
  COUNTERPARTIES_HEADERS,
  COUNTERPARTIES_SHEET,
  counterpartyRowFromImportCells,
  fetchCounterparties,
  formatLocationLabel,
  getCounterpartyFullName
} from './counterparties'
import { exportSheetCsv, importSheetCsv, newImportId, newImportTimestamp } from './importExport'
import { downloadTablePdf } from '../utils/pdf'
import { formatPersianDate } from '../utils/pdfFormat'

export async function exportCounterpartiesCsv(spreadsheetId: string): Promise<void> {
  await exportSheetCsv(
    spreadsheetId,
    COUNTERPARTIES_SHEET,
    COUNTERPARTIES_HEADERS,
    'طرف-حساب‌ها.csv'
  )
}

export async function exportCounterpartiesPdf(spreadsheetId: string): Promise<void> {
  const items = await fetchCounterparties(spreadsheetId)

  await downloadTablePdf({
    title: 'گزارش طرف حساب‌ها',
    headers: ['نام', 'تاریخ تولد', 'آدرس', 'لوکیشن', 'شماره تماس', 'تعداد حساب'],
    rows: items.map(item => [
      getCounterpartyFullName(item),
      item.birthDate ? formatPersianDate(item.birthDate) : '—',
      item.address || '—',
      formatLocationLabel(item.location) || '—',
      item.phones.map(phone => phone.number).join(' · ') || '—',
      item.accounts.length.toLocaleString('fa-IR')
    ]),
    filename: 'طرف-حساب‌ها.pdf'
  })
}

export async function importCounterpartiesCsv(spreadsheetId: string, csvContent: string) {
  return importSheetCsv(
    spreadsheetId,
    COUNTERPARTIES_SHEET,
    COUNTERPARTIES_HEADERS,
    csvContent,
    cells => {
      const row = counterpartyRowFromImportCells(cells)

      if (!row) return null

      return [
        newImportId(row[0] ?? ''),
        newImportTimestamp(row[1] ?? ''),
        row[2],
        row[3],
        row[4],
        row[5],
        row[6],
        row[7],
        row[8],
        row[9]
      ]
    }
  )
}
