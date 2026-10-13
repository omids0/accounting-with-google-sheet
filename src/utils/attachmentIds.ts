/**
 * The «پیوست» column: Drive file ids of a row's receipts, comma separated.
 * Always the last column of its tab, so older app builds keep their layout.
 */
export const ATTACHMENTS_HEADER = 'پیوست'

export const MAX_ATTACHMENTS = 3

/** A cell → its Drive ids, in order, without blanks or repeats. Older rows: []. */
export function parseAttachmentIds(cell: unknown): string[] {
  const ids: string[] = []

  for (const part of String(cell ?? '').split(/[,،\s]+/)) {
    const id = part.trim()

    if (id && !ids.includes(id)) ids.push(id)
  }

  return ids
}

export function serializeAttachmentIds(ids: readonly string[]): string {
  return parseAttachmentIds(ids.join(',')).join(',')
}

/**
 * Entity writers rebuild rows from their own fields and never fill this
 * column: an empty or missing cell there keeps the stored ids. Only the
 * attachment service writes it (or clears it) on purpose.
 */
export function keepAttachmentCell(
  next: string[],
  stored: readonly string[] | null | undefined,
  column: number
): string[] {
  if (column < 0 || !stored) return next

  const kept = String(stored[column] ?? '')

  if (!kept.trim() || String(next[column] ?? '').trim()) return next

  return withAttachmentCell(next, column, kept)
}

/** `row` with `cell` at `column`, padding the gap with empty cells. */
export function withAttachmentCell(row: readonly string[], column: number, cell: string): string[] {
  const next = [...row]

  while (next.length < column) next.push('')
  next[column] = cell

  return next
}
