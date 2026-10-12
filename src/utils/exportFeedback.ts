import { showError, showSuccess } from './toast'
import { toExportErrorMessage } from './userMessage'

/** Resolves the saved file name, or `null` when the user dismissed the share sheet. */
export type ExportTask = () => Promise<string | null>

/** Runs an export and tells the user which file was saved, or why it was not. */
export async function runExport(task: ExportTask, fallbackMessage: string): Promise<void> {
  try {
    const name = await task()

    if (name) showSuccess(`ذخیره شد: ${name}`)
  } catch (err) {
    showError(toExportErrorMessage(err, fallbackMessage))
  }
}
