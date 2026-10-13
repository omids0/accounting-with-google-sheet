import {
  findAttachmentColumn,
  findEntityRow,
  fixedAttachmentColumn,
  headerAttachmentColumn
} from './attachmentColumn'
import { invalidateInstallmentsCache } from './installmentsConstants'
import { withGridGrowth } from './sheetGrid'
import { INSTALLMENTS_SHEET } from './sheetNames'
import { writeSheetHeaders } from './sheetsEnsure'
import { updateSheetRow } from './sheetsRows'
import { getSheetAllRows, setSheetAllRows } from './spreadsheetStore'
import {
  ATTACHMENTS_HEADER,
  parseAttachmentIds,
  serializeAttachmentIds,
  withAttachmentCell
} from '../utils/attachmentIds'

/** Writes «پیوست» into the header at `index` (or the end) unless it is already there. */
async function writeHeaderLabel(
  spreadsheetId: string,
  sheetName: string,
  index: number | 'end'
): Promise<number> {
  const rows = getSheetAllRows(spreadsheetId, sheetName) ?? []
  const header = (rows[0] ?? []).map(cell => String(cell ?? ''))
  const existing = headerAttachmentColumn(header)

  if (existing >= 0) return existing
  if (!header.some(cell => cell.trim())) return index === 'end' ? -1 : index

  const column = index === 'end' ? header.length : index

  // A fixed tab whose cell there holds something else keeps its data by position.
  if (String(header[column] ?? '').trim()) return column

  const next = withAttachmentCell(header, column, ATTACHMENTS_HEADER)

  await withGridGrowth(spreadsheetId, sheetName, 1, next.length, () =>
    writeSheetHeaders(spreadsheetId, sheetName, next)
  )
  setSheetAllRows(spreadsheetId, sheetName, [next, ...rows.slice(1)])

  return column
}

/**
 * The column to write ids into, adding its header the first time: at the fixed
 * index on checks and plans (best effort, the data is read by position), at
 * the end of a record tab's header (needed, records are read by header).
 */
export async function ensureAttachmentColumn(
  spreadsheetId: string,
  sheetName: string
): Promise<number> {
  const fixed = fixedAttachmentColumn(sheetName)

  if (fixed >= 0) {
    await writeHeaderLabel(spreadsheetId, sheetName, fixed).catch(() => undefined)

    return fixed
  }

  const known = findAttachmentColumn(spreadsheetId, sheetName)

  if (known >= 0) return known

  const column = await writeHeaderLabel(spreadsheetId, sheetName, 'end')

  if (column < 0) throw new Error('ستون «پیوست» در برگه ساخته نشد.')

  return column
}

/**
 * Changes the ids of the row whose id is `entityId` (local mirror first, the
 * sheet through the outbox). False when the row no longer exists.
 */
export async function updateRowAttachmentIds(
  spreadsheetId: string,
  sheetName: string,
  entityId: string,
  change: (ids: string[]) => string[]
): Promise<boolean> {
  const found = findEntityRow(spreadsheetId, sheetName, entityId)

  if (!found) return false

  const known = findAttachmentColumn(spreadsheetId, found.sheetName)
  const column = known >= 0 ? known : await ensureAttachmentColumn(spreadsheetId, found.sheetName)
  // The header write above may have replaced the tab's rows in the mirror.
  const ref = findEntityRow(spreadsheetId, found.sheetName, entityId) ?? found
  const current = parseAttachmentIds(ref.row[column])
  const next = serializeAttachmentIds(change(current))

  if (next === serializeAttachmentIds(current)) return true

  await updateSheetRow(
    spreadsheetId,
    ref.sheetName,
    ref.rowNumber,
    withAttachmentCell(ref.row, column, next),
    undefined,
    true
  )
  if (ref.sheetName === INSTALLMENTS_SHEET) invalidateInstallmentsCache(spreadsheetId)

  return true
}

export function addRowAttachment(
  spreadsheetId: string,
  sheetName: string,
  entityId: string,
  fileId: string
): Promise<boolean> {
  return updateRowAttachmentIds(spreadsheetId, sheetName, entityId, ids => [...ids, fileId])
}

export function removeRowAttachments(
  spreadsheetId: string,
  sheetName: string,
  entityId: string,
  fileIds: readonly string[]
): Promise<boolean> {
  return updateRowAttachmentIds(spreadsheetId, sheetName, entityId, ids =>
    ids.filter(id => !fileIds.includes(id))
  )
}
