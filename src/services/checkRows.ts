import { CHECK_ATTACHMENT_COLUMN } from './attachmentColumn'
import {
  CHECK_DIRECTION_COLUMN,
  CHECK_DIRECTION_LABELS,
  parseCheckDirection
} from './checkDirection'
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

export function rowToCheck(row: string[], rowNumber: number): Check & { rowNumber: number } {
  return {
    rowNumber,
    id: row[0] ?? '',
    createdAt: row[1] ?? '',
    checkNumber: row[2] ?? '',
    direction: parseCheckDirection(row[CHECK_DIRECTION_COLUMN]),
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

export function checkToRow(check: Check): string[] {
  const row = [
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

  // «پیوست» and «ثبت‌کننده» sit in between: the writers of those cells fill them in.
  return withAttachmentCell(row, CHECK_DIRECTION_COLUMN, CHECK_DIRECTION_LABELS[check.direction])
}
