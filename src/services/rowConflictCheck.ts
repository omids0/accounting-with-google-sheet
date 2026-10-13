import { getUserEmail } from './auth'
import { detectRowConflict, RowEditConflictError, rowTimeCell } from './rowConflict'
import type { RowGuardSession } from './sheetsRowGuard'
import { fixedWriterColumn } from './writerColumn'
import { headerWriterColumn, parseWriter } from '../utils/writerColumn'

/**
 * Runs right after an outbox update found its row: the session's snapshot of
 * the tab (read once per flush) holds the row as it is on the sheet now.
 * Throws `RowEditConflictError` when another account changed it meanwhile.
 */
export function assertNoEditConflict(
  session: RowGuardSession,
  target: { sheetName: string; rowNumber: number },
  mine: string[],
  base: string[] | undefined
): void {
  const rows = session.snapshots.get(target.sheetName)
  const current = rows?.[target.rowNumber - 1]

  if (!rows || !current || !base) return

  const header = rows[0] ?? []
  const fixed = fixedWriterColumn(target.sheetName)
  const column = fixed >= 0 ? fixed : headerWriterColumn(header)

  if (detectRowConflict(base, current, mine, getUserEmail() ?? '', column) === 'none') return

  throw new RowEditConflictError(
    [...current],
    parseWriter(current[column]),
    rowTimeCell(header, current)
  )
}
