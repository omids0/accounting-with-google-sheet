import { CHECK_DIRECTION_HEADER } from './checkDirection'
import { SHARED_FIELD_LABELS, SHARED_LINK_FIELD_LABEL } from '../components/form/sharedFields'
import { ATTACHMENTS_HEADER } from '../utils/attachmentIds'
import { parseCsv, restoreCsvFormula } from '../utils/csv'
import { WRITER_HEADER } from '../utils/writerColumn'

export const INVALID_IMPORT_ROW_REASON = 'ستون‌های اصلی خالی یا نامعتبر است'

/** How many invalid rows the preview names before it summarises the rest. */
const LISTED_INVALID_ROWS = 5

export interface InvalidImportRow {
  /** Row number in the file, counting the header row as 1 when there is one. */
  line: number
  reason: string
}

export interface ImportPlan {
  /** Non-empty rows in the file. */
  found: number
  duplicates: number
  invalid: InvalidImportRow[]
  /** Rows that will be appended, already transformed to the sheet layout. */
  rows: string[][]
}

/** Returns the sheet row, `null` for an invalid row, or throws an Error whose message is the reason. */
export type ImportRowTransform = (cells: string[]) => string[] | null

export interface ParsedImportCsv {
  dataRows: string[][]
  firstLine: number
}

function hasHeaderRow(firstRow: string[], allHeaders: string[]): boolean {
  // A file exported before «پیوست», «ثبت‌کننده», «نوع چک» or the shared account's record columns
  // existed lacks those trailing columns only.
  const headers = [...allHeaders]
  const optional = [
    WRITER_HEADER,
    ATTACHMENTS_HEADER,
    CHECK_DIRECTION_HEADER,
    ...SHARED_FIELD_LABELS,
    SHARED_LINK_FIELD_LABEL
  ]

  while (headers.length && optional.includes(headers[headers.length - 1])) headers.pop()

  if (firstRow.length < headers.length) return false

  return headers.every((header, index) => firstRow[index]?.trim() === header)
}

export function parseImportCsv(csvContent: string, headers: string[]): ParsedImportCsv {
  const parsed = parseCsv(csvContent).map(cells => cells.map(restoreCsvFormula))

  if (!parsed.length) {
    throw new Error('فایل خالی است')
  }

  return hasHeaderRow(parsed[0], headers)
    ? { dataRows: parsed.slice(1), firstLine: 2 }
    : { dataRows: parsed, firstLine: 1 }
}

function transformOrReason(
  transformRow: ImportRowTransform,
  cells: string[]
): string[] | { reason: string } {
  try {
    return transformRow(cells) ?? { reason: INVALID_IMPORT_ROW_REASON }
  } catch (err) {
    return { reason: err instanceof Error && err.message ? err.message : INVALID_IMPORT_ROW_REASON }
  }
}

/**
 * Id is column 0 on every importable sheet. A row whose id is already in the
 * sheet, or earlier in the same file, is skipped and never overwrites data.
 * `rowKey` identifies a row on a tab keyed otherwise; an empty key never collides.
 */
export function planImport({
  dataRows,
  firstLine,
  existingIds,
  transformRow,
  rowKey = row => row[0] ?? ''
}: ParsedImportCsv & {
  existingIds: Iterable<string>
  transformRow: ImportRowTransform
  rowKey?: (row: string[]) => string
}): ImportPlan {
  const seenIds = new Set(Array.from(existingIds, id => id.trim()).filter(Boolean))

  const plan: ImportPlan = { found: 0, duplicates: 0, invalid: [], rows: [] }

  dataRows.forEach((cells, index) => {
    if (!cells.some(cell => cell.trim())) return

    plan.found++

    const row = transformOrReason(transformRow, cells)

    if (!Array.isArray(row)) {
      plan.invalid.push({ line: firstLine + index, reason: row.reason })

      return
    }

    const id = rowKey(row).trim()

    if (id && seenIds.has(id)) {
      plan.duplicates++

      return
    }
    if (id) seenIds.add(id)
    plan.rows.push(row)
  })

  return plan
}

function faCount(value: number): string {
  return value.toLocaleString('fa-IR')
}

function faLine(value: number): string {
  return value.toLocaleString('fa-IR', { useGrouping: false })
}

function invalidSummary(invalid: InvalidImportRow[]): string {
  if (!invalid.length) return `${faCount(0)} نامعتبر`

  const listed = invalid.slice(0, LISTED_INVALID_ROWS).map(row => faLine(row.line))

  const more = invalid.length > LISTED_INVALID_ROWS ? '، …' : ''

  const label = invalid.length === 1 ? 'ردیف' : 'ردیف‌های'

  return `${faCount(invalid.length)} نامعتبر (${label} ${listed.join('، ')}${more})`
}

/**
 * «N ردیف پیدا شد؛ V قابل افزودن؛ M تکراری (رد می‌شود)؛ K نامعتبر (ردیف‌های …)» plus the first reasons.
 * The spec's «·» separator reads as a Persian zero next to Persian digits, hence «؛».
 */
export function formatImportSummary(plan: ImportPlan): string {
  const lines = [
    [
      `${faCount(plan.found)} ردیف پیدا شد`,
      `${faCount(plan.rows.length)} قابل افزودن`,
      `${faCount(plan.duplicates)} تکراری (رد می‌شود)`,
      invalidSummary(plan.invalid)
    ].join('؛ ')
  ]

  const reasons = plan.invalid
    .slice(0, LISTED_INVALID_ROWS)
    .map(row => `ردیف ${faLine(row.line)}: ${row.reason}`)

  if (reasons.length) lines.push('', ...reasons)
  if (!plan.rows.length) lines.push('', 'ردیف تازه‌ای برای افزودن نیست.')

  return lines.join('\n')
}
