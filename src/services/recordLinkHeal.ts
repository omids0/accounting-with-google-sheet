import { getArchiveTabs } from './archiveRegistry'
import { reopenLinksToMissingRecords } from './recordLinks'
import { sessionStart, waitForSessionSync } from './sessionSync'
import { getSettings } from './settings'
import { getSheetRowsView } from './spreadsheetStore'
import { isPersonalWorkspace } from './workspace'

/** Workspaces already checked since the app started: the heal runs once per start. */
const healed = new Set<string>()

/**
 * The ids of every income and expense record, from the local mirror: the forms' tabs and every
 * yearly archive tab (an archived record is not a missing one). `null` when a tab that could hold
 * records is not in the mirror yet, because then «no such record» proves nothing.
 */
function recordIdsInMirror(spreadsheetId: string): Set<string> | null {
  const forms = (getSettings()?.forms ?? []).filter(
    form => form.type === 'income' || form.type === 'expense'
  )
  const tabs = [...forms.map(form => form.sheetName), ...getArchiveTabs(spreadsheetId)]
  const ids = new Set<string>()

  for (const tab of tabs) {
    const rows = getSheetRowsView(spreadsheetId, tab)

    if (!rows) return null
    for (let index = 1; index < rows.length; index += 1) {
      const id = String(rows[index][0] ?? '').trim()

      if (id) ids.add(id)
    }
  }

  return ids
}

/**
 * Finishes record deletes that were cut short (reload, killed app): a debt payment, receivable
 * payment, check or instalment that still points at a record that is gone is reopened exactly as a
 * live delete does. Reads only the local mirror, so it costs nothing when nothing is broken, and
 * it is silent. Run it after the first sync of a launch, when the mirror holds the sheet's state.
 */
export async function healOrphanedRecordLinks(spreadsheetId: string): Promise<number> {
  if (healed.has(spreadsheetId) || !isPersonalWorkspace(spreadsheetId)) return 0
  if (getSettings()?.spreadsheetId !== spreadsheetId) return 0

  const ids = recordIdsInMirror(spreadsheetId)

  if (!ids) return 0
  healed.add(spreadsheetId)

  return reopenLinksToMissingRecords(spreadsheetId, recordId => ids.has(recordId))
}

/** Start-up entry: waits for the launch's first successful sync, then heals once. */
export async function runRecordLinkHeal(spreadsheetId: string): Promise<void> {
  if (healed.has(spreadsheetId) || !isPersonalWorkspace(spreadsheetId)) return
  if (!(await waitForSessionSync(sessionStart()))) return

  await healOrphanedRecordLinks(spreadsheetId)
}

/** For tests: forget which workspaces were healed. */
export function resetRecordLinkHeal(): void {
  healed.clear()
}
