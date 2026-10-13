import { withAttachmentCell } from './attachmentIds'

/**
 * The «ثبت‌کننده» column: the Google email of whoever last created or edited
 * the row. Appended after every other column, so older app builds keep their
 * layout; rows from before round 8 leave it empty.
 */
export const WRITER_HEADER = 'ثبت‌کننده'

function sameLabel(cell: unknown): boolean {
  return (
    String(cell ?? '')
      .normalize('NFC')
      .trim() === WRITER_HEADER
  )
}

/** Where a header row keeps «ثبت‌کننده»; -1 when it has none. */
export function headerWriterColumn(header: readonly unknown[] | null | undefined): number {
  return header ? header.findIndex(sameLabel) : -1
}

/** A cell → the email in it, trimmed and lower-cased; '' for older rows. */
export function parseWriter(cell: unknown): string {
  return String(cell ?? '')
    .trim()
    .toLowerCase()
}

/** `row` with `email` at `column`; unchanged when there is no column or no email. */
export function withWriterCell(row: readonly string[], column: number, email: string): string[] {
  if (column < 0 || !email.trim()) return [...row]

  return withAttachmentCell(row, column, parseWriter(email))
}
