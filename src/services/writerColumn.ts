import { getUserEmail } from './auth'
import {
  CHECKS_HEADERS,
  DANG_HEADERS,
  INSTALLMENTS_HEADERS,
  RECEIVABLES_HEADERS
} from './sheetHeaders'
import { CHECKS_SHEET, DANG_SHEET, INSTALLMENTS_SHEET, RECEIVABLES_SHEET } from './sheetNames'
import { getSheetAllRows, getSheetRow, setSheetAllRows } from './spreadsheetStore'
import { withAttachmentCell } from '../utils/attachmentIds'
import { headerWriterColumn, WRITER_HEADER, withWriterCell } from '../utils/writerColumn'

/**
 * Fixed-layout tabs read «ثبت‌کننده» at the index their header list gives it
 * (right after «پیوست»). Record tabs follow their own header row, where the label is
 * appended once at the end, like «پیوست».
 */
const FIXED_COLUMNS: Record<string, number> = {
  [CHECKS_SHEET]: CHECKS_HEADERS.indexOf(WRITER_HEADER),
  [INSTALLMENTS_SHEET]: INSTALLMENTS_HEADERS.indexOf(WRITER_HEADER),
  [DANG_SHEET]: DANG_HEADERS.indexOf(WRITER_HEADER),
  [RECEIVABLES_SHEET]: RECEIVABLES_HEADERS.indexOf(WRITER_HEADER)
}

export const CHECK_WRITER_COLUMN = FIXED_COLUMNS[CHECKS_SHEET]
export const INSTALLMENT_WRITER_COLUMN = FIXED_COLUMNS[INSTALLMENTS_SHEET]
export const DANG_WRITER_COLUMN = FIXED_COLUMNS[DANG_SHEET]
export const RECEIVABLE_WRITER_COLUMN = FIXED_COLUMNS[RECEIVABLES_SHEET]

/** The fixed index of a positional tab, or -1 for a header-driven one. */
export function fixedWriterColumn(sheetName: string): number {
  return FIXED_COLUMNS[sheetName] ?? -1
}

/** Where a tab keeps the writer right now; -1 while it has no «ثبت‌کننده» column. */
export function findWriterColumn(spreadsheetId: string, sheetName: string): number {
  const fixed = fixedWriterColumn(sheetName)

  if (fixed >= 0) return fixed

  return headerWriterColumn(getSheetRow(spreadsheetId, sheetName, 1))
}

const headerWrites = new Set<string>()

/**
 * The mirror gets the label at once, so the row being saved already carries
 * the writer; the sheet's header follows in the background (best effort: a
 * failed write is tried again after the next pull drops the label).
 */
function writeHeaderSoon(spreadsheetId: string, sheetName: string, header: string[]): void {
  const rows = getSheetAllRows(spreadsheetId, sheetName) ?? []

  setSheetAllRows(spreadsheetId, sheetName, [header, ...rows.slice(1)])

  const key = `${spreadsheetId}::${sheetName}`

  if (headerWrites.has(key)) return
  headerWrites.add(key)

  void Promise.all([import('./sheetGrid'), import('./sheetsEnsure')])
    .then(([grid, ensure]) =>
      grid.withGridGrowth(spreadsheetId, sheetName, 1, header.length, () =>
        ensure.writeSheetHeaders(spreadsheetId, sheetName, header)
      )
    )
    .catch(() => undefined)
    .finally(() => headerWrites.delete(key))
}

/**
 * The column to stamp, adding its header label the first time: at the fixed
 * index on the four module tabs, at the end of a record tab's header. -1 when
 * signed out or the tab has no header yet.
 */
export function ensureWriterColumn(spreadsheetId: string, sheetName: string): number {
  if (!getUserEmail()) return -1

  const header = (getSheetRow(spreadsheetId, sheetName, 1) ?? []).map(cell => String(cell ?? ''))
  const existing = headerWriterColumn(header)
  const fixed = fixedWriterColumn(sheetName)

  if (existing >= 0) return fixed >= 0 ? fixed : existing
  if (!header.some(cell => cell.trim())) return fixed

  const column = fixed >= 0 ? fixed : header.length

  // A fixed tab whose cell there holds something else keeps its data by position.
  if (!String(header[column] ?? '').trim()) {
    writeHeaderSoon(spreadsheetId, sheetName, withAttachmentCell(header, column, WRITER_HEADER))
  }

  return column
}

/** `row` with the signed-in email in the tab's «ثبت‌کننده» cell, when the tab has one. */
export function stampWriter(spreadsheetId: string, sheetName: string, row: string[]): string[] {
  const email = getUserEmail()

  if (!email) return row

  const column =
    fixedWriterColumn(sheetName) >= 0
      ? ensureWriterColumn(spreadsheetId, sheetName)
      : findWriterColumn(spreadsheetId, sheetName)

  return column < 0 ? row : withWriterCell(row, column, email)
}
