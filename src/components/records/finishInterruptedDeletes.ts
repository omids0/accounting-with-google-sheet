import { deleteStoredRecord } from './recordsMutations'
import { enrichRecord } from './recordsUtils'
import {
  clearRecordDeletePending,
  isRecordDeleteLive,
  markRecordDeletePending,
  pendingRecordDeleteIds
} from '../../services/pendingRecordDeletes'
import { recordIdsInMirror } from '../../services/recordLinkHeal'
import { sessionStart, waitForSessionSync } from '../../services/sessionSync'
import { getSettings } from '../../services/settings'
import { fetchRecords } from '../../services/sheets'
import { isPersonalWorkspace } from '../../services/workspace'

/** Workspaces already checked since the app started: the heal runs once per start. */
const finished = new Set<string>()

/**
 * Completes record deletes the user confirmed but that a reload or a killed app cut short. The
 * delete leaves a marker (`markRecordDeletePending`) before its first write and removes it once
 * the row is gone, so a marker that is still here at start means an interrupted delete: the record
 * is deleted now, exactly as the user asked (the refund is skipped when it is already logged, and
 * the instalment / check / debt payment it paid is reopened). Reads only the local mirror, silent,
 * personal books only; costs one storage read when nothing is pending. Run it after the first sync.
 */
export async function finishInterruptedRecordDeletes(spreadsheetId: string): Promise<number> {
  if (finished.has(spreadsheetId) || !isPersonalWorkspace(spreadsheetId)) return 0
  if (getSettings()?.spreadsheetId !== spreadsheetId) return 0
  if (!pendingRecordDeleteIds(spreadsheetId).length) return 0
  if (!(await waitForSessionSync(sessionStart()))) return 0

  // Read after the wait: a delete this page started meanwhile is not an interrupted one.
  const pending = pendingRecordDeleteIds(spreadsheetId).filter(
    id => !isRecordDeleteLive(spreadsheetId, id)
  )

  // A tab that is not in the mirror yet proves nothing about «no such record»: try next start.
  const existing = recordIdsInMirror(spreadsheetId)

  if (!existing) return 0
  finished.add(spreadsheetId)

  // Gone already (or archived by the delete's own copy removal): nothing left to finish.
  for (const id of pending) if (!existing.has(id)) clearRecordDeletePending(spreadsheetId, id)

  const todo = new Set(pending.filter(id => existing.has(id)))

  if (!todo.size) return 0

  let done = 0

  for (const form of (getSettings()?.forms ?? []).filter(
    item => item.type === 'income' || item.type === 'expense'
  )) {
    for (const record of await fetchRecords(spreadsheetId, form)) {
      if (!todo.has(record.id)) continue
      todo.delete(record.id)
      try {
        await deleteStoredRecord({ spreadsheetId, record: enrichRecord(record, form), form })
        done += 1
      } catch {
        // The delete clears its marker when it fails; put it back for the next start.
        markRecordDeletePending(spreadsheetId, record.id)
      }
    }
  }

  return done
}

/** For tests: forget which workspaces were checked. */
export function resetFinishedRecordDeletes(): void {
  finished.clear()
}
