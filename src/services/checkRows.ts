import { CHECK_ATTACHMENT_COLUMN } from './attachmentColumn'
import { CHECK_DIRECTION_LABELS, parseCheckDirection, unknownDirectionCell } from './checkDirection'
import { CHECK_WRITER_COLUMN } from './writerColumn'
import type { Check } from '../types'
import { parseAttachmentIds, withAttachmentCell } from '../utils/attachmentIds'
import { parseNumeric } from '../utils/parseNumeric'
import { parseWriter } from '../utils/writerColumn'

export function parsePaid(raw: string): boolean {
  const v = String(raw ?? '')
    .trim()
    .toLowerCase()

  return v === 'true' || v === '1' || v === 'بله' || v === 'yes'
}

/**
 * `directionColumn` is where the tab's header keeps «نوع چک» (-1 while it has none: every
 * check reads as a payable).
 */
export function rowToCheck(
  row: string[],
  rowNumber: number,
  directionColumn = -1
): Check & { rowNumber: number } {
  const cell = directionColumn >= 0 ? row[directionColumn] : undefined

  return {
    rowNumber,
    id: row[0] ?? '',
    createdAt: row[1] ?? '',
    checkNumber: row[2] ?? '',
    direction: parseCheckDirection(cell),
    directionRaw: unknownDirectionCell(cell) || undefined,
    counterparty: row[3] ?? '',
    amount: parseNumeric(row[4]),
    creationDate: row[5] ?? '',
    dueDate: row[6] ?? '',
    paid: parsePaid(row[7] ?? ''),
    paidAt: row[8] ?? '',
    transactionRecordId: row[9] ?? '',
    subCategory: row[10] ?? '',
    attachments: parseAttachmentIds(row[CHECK_ATTACHMENT_COLUMN]),
    writer: parseWriter(row[CHECK_WRITER_COLUMN])
  }
}

/**
 * The row to write. Built on `stored` (the row as the tab has it) so every cell the app does
 * not own survives: «پیوست», «ثبت‌کننده» (kept when nobody is signed in) and the user's own
 * columns. A new row has none, so its gaps are empty. The type goes only into
 * `directionColumn` (a column labelled «نوع چک»), never by position.
 */
export function checkToRow(
  check: Check,
  directionColumn = -1,
  stored?: readonly string[]
): string[] {
  const cells = [
    check.id,
    check.createdAt,
    check.checkNumber,
    check.counterparty,
    String(check.amount),
    check.creationDate,
    check.dueDate,
    check.paid ? 'بله' : 'خیر',
    check.paidAt,
    check.transactionRecordId ?? '',
    check.subCategory ?? ''
  ]

  let row = [...(stored ?? [])]

  cells.forEach((cell, index) => {
    row = withAttachmentCell(row, index, cell)
  })

  return directionColumn < 0
    ? row
    : withAttachmentCell(row, directionColumn, CHECK_DIRECTION_LABELS[check.direction])
}
