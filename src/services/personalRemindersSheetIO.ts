import { exportSheetCsv, importSheetCsv, newImportId, newImportTimestamp } from './importExport'
import {
  PERSONAL_REMINDERS_HEADERS,
  PERSONAL_REMINDERS_SHEET,
  fetchPersonalReminders,
  getPersonalReminderCategoryLabel,
  getPersonalReminderRecurrenceLabel,
  personalReminderRowFromImportCells
} from './personalReminders'
import { formatMoney } from '../utils/formatMoney'
import { downloadTablePdf } from '../utils/pdf'
import { formatPersianDate } from '../utils/pdfFormat'

export async function exportPersonalRemindersCsv(spreadsheetId: string): Promise<void> {
  await exportSheetCsv(
    spreadsheetId,
    PERSONAL_REMINDERS_SHEET,
    PERSONAL_REMINDERS_HEADERS,
    'یادآوری‌ها.csv'
  )
}

export async function exportPersonalRemindersPdf(spreadsheetId: string): Promise<void> {
  const items = await fetchPersonalReminders(spreadsheetId)

  await downloadTablePdf({
    title: 'گزارش یادآوری‌ها',
    headers: ['عنوان', 'دسته‌بندی', 'تاریخ', 'تکرار', 'مبلغ', 'روز قبل', 'وضعیت'],
    rows: items.map(item => [
      item.title,
      getPersonalReminderCategoryLabel(item.category),
      formatPersianDate(item.dueDate),
      getPersonalReminderRecurrenceLabel(item.recurrence),
      item.amount > 0 ? formatMoney(item.amount) : '—',
      item.daysBefore.toLocaleString('fa-IR'),
      item.enabled ? 'فعال' : 'غیرفعال'
    ]),
    filename: 'یادآوری‌ها.pdf',
    cellClasses: items.map(() => ['', '', '', '', 'pdf-cell-amount', '', ''])
  })
}

export async function importPersonalRemindersCsv(spreadsheetId: string, csvContent: string) {
  return importSheetCsv(
    spreadsheetId,
    PERSONAL_REMINDERS_SHEET,
    PERSONAL_REMINDERS_HEADERS,
    csvContent,
    cells => {
      const row = personalReminderRowFromImportCells(cells)

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
        row[8]
      ]
    }
  )
}
