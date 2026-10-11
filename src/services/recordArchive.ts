import type { CustomForm } from '../types'
import { buildFieldColumnMap, buildHeaders } from './sheetsHeaders'
import { normalizeSheetTitle } from './sheetsMeta'
import { isoToJalali } from '../utils/jalaliDate'
import { cellToString, isSheetHeaderRow, normalizeSheetDate } from '../utils/sheetValues'

/**
 * Past years move out of a form tab only once it holds more data rows than
 * this. Measured: ~34 bytes per row on the wire, so ~170 KB per download here.
 */
export const ARCHIVE_THRESHOLD_ROWS = 5000

const ARCHIVE_TITLE = /^(.+) (1[34]\d\d)$/

export function archiveSheetName(baseSheetName: string, year: number): string {
  return `${baseSheetName} ${year}`
}

/** `{ form, year }` when `title` is `<form tab> <Jalali year>`; never a configured form tab. */
export function parseArchiveSheetName(
  title: string,
  forms: CustomForm[]
): { form: CustomForm; year: number } | null {
  const normalized = normalizeSheetTitle(title)

  if (forms.some(form => normalizeSheetTitle(form.sheetName) === normalized)) return null

  const match = ARCHIVE_TITLE.exec(normalized)

  if (!match) return null

  const form = forms.find(item => normalizeSheetTitle(item.sheetName) === match[1])

  return form ? { form, year: Number(match[2]) } : null
}

function dateColumn(form: CustomForm, header: string[]): number | null {
  const dateField = form.fields.find(field => field.type === 'date')

  if (!dateField) return null

  return buildFieldColumnMap(header, form.fields).get(dateField.id) ?? null
}

function rowJalaliYear(row: unknown[], column: number): number | null {
  const iso = normalizeSheetDate(row[column])

  return iso ? isoToJalali(iso).year : null
}

/**
 * Past-year data rows grouped by Jalali year, or null when the tab is not
 * over the threshold or has nothing older than `currentYear`. Rows without a
 * readable date always stay in the base tab.
 */
export function planYearSweep(
  allRows: string[][],
  form: CustomForm,
  currentYear: number
): Map<number, string[][]> | null {
  const hasHeader = allRows.length > 0 && isSheetHeaderRow(allRows[0])

  const header = hasHeader ? allRows[0].map(cell => cellToString(cell)) : buildHeaders(form.fields)

  const dataRows = (hasHeader ? allRows.slice(1) : allRows).filter(row =>
    cellToString(row[0]).trim()
  )

  if (dataRows.length <= ARCHIVE_THRESHOLD_ROWS) return null

  const column = dateColumn(form, header)

  if (column === null) return null

  const byYear = new Map<number, string[][]>()

  for (const row of dataRows) {
    const year = rowJalaliYear(row, column)

    if (year === null || year >= currentYear) continue

    const bucket = byYear.get(year)

    if (bucket) bucket.push(row)
    else byYear.set(year, [row])
  }

  return byYear.size ? byYear : null
}

/** The archive tabs among `titles`, in their given order. */
export function listArchiveSheets(titles: Iterable<string>, forms: CustomForm[]): string[] {
  return [...titles].filter(title => parseArchiveSheetName(title, forms) !== null)
}
