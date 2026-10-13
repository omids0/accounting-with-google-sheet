import { CHECKS_HEADERS, INSTALLMENTS_HEADERS } from './sheetHeaders'
import { CHECKS_SHEET, INSTALLMENTS_SHEET } from './sheetNames'
import { getSheetAllRows, getSheetRow, getStoreSheetNames } from './spreadsheetStore'
import { ATTACHMENTS_HEADER, parseAttachmentIds } from '../utils/attachmentIds'

/**
 * Fixed-layout tabs read their cells by position, so «پیوست» sits at the index
 * its header list gives it. Record tabs follow their own header row instead
 * (form fields come and go), where «پیوست» is appended once, at the end.
 */
const FIXED_COLUMNS: Record<string, number> = {
  [CHECKS_SHEET]: CHECKS_HEADERS.indexOf(ATTACHMENTS_HEADER),
  [INSTALLMENTS_SHEET]: INSTALLMENTS_HEADERS.indexOf(ATTACHMENTS_HEADER)
}

export const CHECK_ATTACHMENT_COLUMN = FIXED_COLUMNS[CHECKS_SHEET]

export const INSTALLMENT_ATTACHMENT_COLUMN = FIXED_COLUMNS[INSTALLMENTS_SHEET]

/** The fixed index of a positional tab, or -1 for a header-driven one. */
export function fixedAttachmentColumn(sheetName: string): number {
  return FIXED_COLUMNS[sheetName] ?? -1
}

function sameLabel(cell: unknown): boolean {
  return (
    String(cell ?? '')
      .normalize('NFC')
      .trim() === ATTACHMENTS_HEADER
  )
}

export function headerAttachmentColumn(header: readonly unknown[] | null | undefined): number {
  return header ? header.findIndex(sameLabel) : -1
}

/** Where a tab keeps its ids right now; -1 while a record tab has no «پیوست» header yet. */
export function findAttachmentColumn(spreadsheetId: string, sheetName: string): number {
  const fixed = fixedAttachmentColumn(sheetName)

  if (fixed >= 0) return fixed

  return headerAttachmentColumn(getSheetRow(spreadsheetId, sheetName, 1))
}

export interface EntityRowRef {
  sheetName: string
  /** 1-based sheet row (the header is row 1). */
  rowNumber: number
  row: string[]
}

function findInTab(
  spreadsheetId: string,
  sheetName: string,
  entityId: string
): EntityRowRef | null {
  const rows = getSheetAllRows(spreadsheetId, sheetName) ?? []

  for (let index = 1; index < rows.length; index += 1) {
    if (String(rows[index][0] ?? '').trim() === entityId) {
      return { sheetName, rowNumber: index + 1, row: rows[index] }
    }
  }

  return null
}

/**
 * The row whose id (column A) is `entityId`: in `sheetName` first, then in any
 * other mirrored tab, because a record may have moved to its yearly archive.
 */
export function findEntityRow(
  spreadsheetId: string,
  sheetName: string,
  entityId: string
): EntityRowRef | null {
  const id = entityId.trim()

  if (!id) return null

  const direct = findInTab(spreadsheetId, sheetName, id)

  if (direct) return direct

  for (const tab of getStoreSheetNames(spreadsheetId)) {
    if (tab === sheetName) continue

    const found = findInTab(spreadsheetId, tab, id)

    if (found) return found
  }

  return null
}

/** The uploaded ids a row carries in the local mirror. */
export function readRowAttachmentIds(ref: EntityRowRef, spreadsheetId: string): string[] {
  const column = findAttachmentColumn(spreadsheetId, ref.sheetName)

  return column < 0 ? [] : parseAttachmentIds(ref.row[column])
}
