import { UNDO_WINDOW_MS } from '../../hooks/useUndoableDelete'
import { runAutoPost, type AutoPosted } from '../../services/recurringPost'
import { saveRecurringItem } from '../../services/recurringSheet'
import { getSettings } from '../../services/settings'
import { fetchRecords } from '../../services/sheets'
import { haptic } from '../../utils/haptics'
import { getTodayIso } from '../../utils/jalaliDate'
import { handleSheetError } from '../../utils/sheetError'
import { deleteStoredRecord } from '../records/recordsMutations'
import { enrichRecord } from '../records/recordsUtils'
import { dismissUndoToast, showUndoToast } from '../UndoToast'

/** Undo: the record goes (its balance change too) and «آخرین ثبت» is put back. */
async function undoAutoPosts(spreadsheetId: string, posted: AutoPosted[]): Promise<void> {
  for (const entry of posted) {
    const record = (await fetchRecords(spreadsheetId, entry.form)).find(
      item => item.id === entry.recordId
    )

    if (record) {
      await deleteStoredRecord({
        spreadsheetId,
        record: enrichRecord(record, entry.form),
        form: entry.form
      })
    }
    await saveRecurringItem(spreadsheetId, { ...entry.item, lastPosted: entry.previousLastPosted })
  }
}

function postedMessage(posted: AutoPosted[]): string {
  if (posted.length > 1) return `${posted.length.toLocaleString('fa-IR')} تکرار ماهانه ثبت شد`

  const { item } = posted[0]

  return `«${item.title || item.category}» ثبت شد (تکراری)`
}

/**
 * Auto-mode recurring items on app open: posted with note «تکراری», then a
 * five-second «بازگردانی» toast (round-3 undo pattern, reversed: the write
 * already happened, undo deletes it).
 */
export async function runRecurringAutoPost(spreadsheetId: string): Promise<void> {
  const settings = getSettings()

  if (!settings || settings.spreadsheetId !== spreadsheetId) return

  // Offline or the tab cannot be read: nothing is posted, the next open tries again.
  const posted = await runAutoPost(settings, getTodayIso()).catch(() => [])

  if (!posted.length) return

  let open = true
  const close = () => {
    if (!open) return false
    open = false
    dismissUndoToast(toastId)

    return true
  }
  const toastId = showUndoToast(
    '',
    UNDO_WINDOW_MS,
    () => {
      if (!close()) return
      haptic('success')
      void undoAutoPosts(spreadsheetId, posted).catch(err =>
        handleSheetError(err, { fallbackMessage: 'بازگردانی تکرار انجام نشد' })
      )
    },
    postedMessage(posted)
  )

  haptic('light')
  setTimeout(close, UNDO_WINDOW_MS)
}
