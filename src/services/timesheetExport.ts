import { exportSheetCsv, importSheetCsv, newImportId, newImportTimestamp } from './importExport'
import { fetchSheetRows } from './sheets'
import { fetchTimesheetEntries, fetchTimesheets, totalDurationMinutes } from './timesheetCrud'
import {
  TIMESHEET_ENTRIES_HEADERS,
  TIMESHEET_ENTRIES_SHEET,
  TIMESHEETS_HEADERS,
  TIMESHEETS_SHEET,
  buildTimesheetEntryFromImport,
  sortTimesheets,
  timesheetEntryToRow,
  timesheetToRow
} from './timesheetRow'
import { formatDateTimePersian, formatDurationFa } from '../utils/datetime'
import { downloadTablePdf } from '../utils/pdf'
import { formatPersianDate } from '../utils/pdfFormat'

export async function exportTimesheetsCsv(spreadsheetId: string): Promise<void> {
  await exportSheetCsv(spreadsheetId, TIMESHEETS_SHEET, TIMESHEETS_HEADERS, 'تایم‌شیت‌ها.csv')
}

export async function exportTimesheetEntriesCsv(
  spreadsheetId: string,
  timesheetId: string,
  filename: string
): Promise<void> {
  const rows = await fetchSheetRows(spreadsheetId, TIMESHEET_ENTRIES_SHEET)

  const filtered = rows.filter(row => row[1] === timesheetId)

  const csvRows = [TIMESHEET_ENTRIES_HEADERS, ...filtered]

  const content = csvRows
    .map(row =>
      row
        .map(cell => {
          const value = String(cell ?? '')

          if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`

          return value
        })
        .join(',')
    )
    .join('\n')

  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' })

  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')

  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export async function exportTimesheetsPdf(spreadsheetId: string): Promise<void> {
  const items = sortTimesheets(await fetchTimesheets(spreadsheetId))

  const headers = ['عنوان', 'توضیحات', 'زمان ثبت']

  const rows = items.map(item => [item.title, item.description, item.createdAt])

  await downloadTablePdf({
    title: 'گزارش تایم‌شیت‌ها',
    headers,
    rows,
    filename: 'تایم‌شیت‌ها.pdf'
  })
}

export async function exportTimesheetEntriesPdf(
  spreadsheetId: string,
  timesheetId: string,
  timesheetTitle: string
): Promise<void> {
  const entries = await fetchTimesheetEntries(spreadsheetId, timesheetId)

  const totalMinutes = totalDurationMinutes(entries)

  const headers = ['عنوان', 'شروع', 'پایان', 'مدت', 'تایید', 'توضیحات']

  const rows = entries.map(entry => [
    entry.title,
    formatDateTimePersian(entry.startAt),
    formatDateTimePersian(entry.endAt),
    formatDurationFa(entry.durationMinutes),
    entry.checked ? 'بله' : 'خیر',
    entry.description
  ])

  rows.push(['', '', 'جمع کل', formatDurationFa(totalMinutes), '', ''])

  await downloadTablePdf({
    title: `گزارش تایم‌شیت: ${timesheetTitle}`,
    headers,
    rows,
    filename: `${timesheetTitle}.pdf`
  })
}

export async function importTimesheetsCsv(spreadsheetId: string, csvContent: string) {
  return importSheetCsv(spreadsheetId, TIMESHEETS_SHEET, TIMESHEETS_HEADERS, csvContent, cells => {
    const title = (cells[2] ?? '').trim()

    if (!title) return null

    return timesheetToRow({
      id: newImportId(cells[0] ?? ''),
      createdAt: newImportTimestamp(cells[1] ?? ''),
      title,
      description: cells[3] ?? ''
    })
  })
}

export async function importTimesheetEntriesCsv(
  spreadsheetId: string,
  timesheetId: string,
  csvContent: string
) {
  return importSheetCsv(
    spreadsheetId,
    TIMESHEET_ENTRIES_SHEET,
    TIMESHEET_ENTRIES_HEADERS,
    csvContent,
    cells => {
      const entry = buildTimesheetEntryFromImport(
        [
          newImportId(cells[0] ?? ''),
          cells[1] ?? '',
          newImportTimestamp(cells[2] ?? ''),
          cells[3] ?? '',
          cells[4] ?? '',
          cells[5] ?? '',
          cells[6] ?? '',
          cells[7] ?? '',
          cells[8] ?? ''
        ],
        timesheetId
      )

      if (!entry) return null

      return timesheetEntryToRow(entry)
    }
  )
}

export function formatEntryDateForPdf(iso: string): string {
  return formatPersianDate(iso.slice(0, 10))
}
