import { showError, showInfo, showSuccess } from './toast'
import { toExportErrorMessage } from './userMessage'
import { sharedCan, SHARED_NO_ACCESS_MESSAGE } from '../services/sharedCan'

/** Resolves the saved file name, or `null` when the user dismissed the share sheet. */
export type ExportTask = () => Promise<string | null>

export const NOTHING_TO_EXPORT_MESSAGE = 'چیزی برای خروجی نیست'

/**
 * Runs an export and tells the user which file was saved, or why it was not.
 * `empty` (the list being exported has no rows) says so instead of exporting an empty file.
 */
export async function runExport(
  task: ExportTask,
  fallbackMessage: string,
  { empty = false }: { empty?: boolean } = {}
): Promise<void> {
  // A shared account's «خروجی و پشتیبان» permission (always true elsewhere).
  if (!sharedCan('export')) {
    showError(SHARED_NO_ACCESS_MESSAGE)

    return
  }
  if (empty) {
    showInfo(NOTHING_TO_EXPORT_MESSAGE)

    return
  }

  try {
    const name = await task()

    if (name) showSuccess(`ذخیره شد: ${name}`)
  } catch (err) {
    showError(toExportErrorMessage(err, fallbackMessage))
  }
}
