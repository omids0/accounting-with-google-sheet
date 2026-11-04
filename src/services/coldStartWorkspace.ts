import { getSettings, getSpreadsheets, setActiveSpreadsheet } from './settings'
import { isChildWorkspace, personalSpreadsheet } from './workspace'

/**
 * Decision (parent view of a child's account): a COLD start, meaning a new page load or a new app
 * process (a hard refresh counts), never opens on a child's account. The child's sheet stays the
 * active one only for the session in which the parent entered it from «فرزندان من».
 *
 * Why: the personal start-up jobs (`useEngagementReminders`: monthly auto-post, reminders, the
 * net-worth snapshot, the weekly backup) run once per page load for the sheet that is active at
 * that moment, and skip a child's account. If the app woke up inside it, they would be skipped for
 * the whole session, and the parent would land inside the child's view instead of their own books.
 * A normal in-session switch (`switchActiveSpreadsheet`) does not pass through here.
 *
 * What it does: when the persisted active sheet is a child's account, the parent's own personal
 * sheet (`personalSpreadsheet`: the remembered one, else the first personal one) becomes active
 * before the first render. The child registry (`accounting_children_v1`, the `kind: 'child'`
 * entries) is not touched, so «فرزندان من» still lists every child and re-enters one. With no
 * personal sheet to go to nothing changes. Deep links and launch actions (`?parent=`, the SMS
 * notification) then meet the personal workspace, which is the one they belong to; a child's page
 * in the address bar is sent home by `workspaceRedirect`.
 *
 * Returns the id that became active, or null when nothing changed. Never throws: start-up must
 * not depend on it.
 */
export function leaveChildOnColdStart(): string | null {
  try {
    const activeId = getSettings()?.spreadsheetId

    if (!activeId || !isChildWorkspace(activeId)) return null

    const personal = personalSpreadsheet(getSpreadsheets())

    if (!personal) return null
    setActiveSpreadsheet(personal.id)

    return personal.id
  } catch {
    return null
  }
}
