import { requiredTextCell, withCells } from './importCellValidate'
import { parseImportDateTime } from './importDateCell'

function dateTimeCell(cell: string | undefined, label: string): string {
  const text = String(cell ?? '').trim()

  if (!text) throw new Error(`${label} خالی است`)

  const iso = parseImportDateTime(text)

  if (!iso) throw new Error(`${label} معتبر نیست`)

  return iso
}

/**
 * A timesheet entry CSV row the sheet can take: a title, and a start and an end that are real
 * date-times (they come back as `YYYY-MM-DDTHH:mm:ss`; Jalali and Persian digits are read) with the
 * end after the start. The duration column is ignored, it is worked out from the two. Throws an
 * Error whose message is the reason shown in the import preview.
 */
export function validateTimesheetEntryCsvCells(cells: string[]): string[] {
  const title = requiredTextCell(cells[3], 'عنوان')

  const startAt = dateTimeCell(cells[4], 'شروع')

  const endAt = dateTimeCell(cells[5], 'پایان')

  if (endAt <= startAt) throw new Error('پایان باید بعد از شروع باشد')

  return withCells(cells, { 3: title, 4: startAt, 5: endAt })
}
