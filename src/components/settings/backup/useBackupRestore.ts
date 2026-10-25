import { useCallback, useState } from 'react'

import { isAuthError } from '../../../services/auth'
import type { RestoreMode } from '../../../services/backupPlan'
import type { RestorePreview, RestoreProgress } from '../../../services/backupRestore'
import { formatRestoreReport } from '../../../services/backupSummary'
import { sharedCan, SHARED_NO_ACCESS_MESSAGE } from '../../../services/sharedCan'
import { requireSpreadsheetId } from '../../../utils/authGuard'
import { pickFile } from '../../../utils/csv'
import { handleSheetError } from '../../../utils/sheetError'
import { showError } from '../../../utils/toast'
import { toUserMessage } from '../../../utils/userMessage'

export type RestoreStage = 'closed' | 'preview' | 'confirm' | 'running' | 'done'

const ZIP_ACCEPT = '.zip,application/zip,application/x-zip-compressed'

const RESTORE_ERROR = 'خطا در بازیابی'

/** A restore rewrites everyone's records: in a shared account only with «ویرایش ثبت‌های دیگران». */
function mayRestore(): boolean {
  if (sharedCan('editOthers')) return true
  showError(SHARED_NO_ACCESS_MESSAGE)

  return false
}

/**
 * «بازیابی از پشتیبان…»: pick → preview and mode → confirm → progress → report.
 * The restore code (and fflate) loads only after a file is picked.
 */
export function useBackupRestore() {
  const [stage, setStage] = useState<RestoreStage>('closed')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<RestorePreview | null>(null)
  const [mode, setMode] = useState<RestoreMode>('merge')
  const [progress, setProgress] = useState<RestoreProgress | null>(null)
  const [result, setResult] = useState('')

  /** Opens the preview for a zip from any source: a picked file or a Drive version. */
  const startFrom = useCallback(
    async (read: () => Promise<ArrayBuffer>) => {
      if (loading || !requireSpreadsheetId() || !mayRestore()) return

      setLoading(true)
      try {
        const [{ previewBackup }, bytes] = await Promise.all([
          import('../../../services/backupRestore'),
          read()
        ])

        setPreview(previewBackup(new Uint8Array(bytes)))
        setMode('merge')
        setStage('preview')
      } catch (err) {
        if (isAuthError(err)) handleSheetError(err)
        else showError(toUserMessage(err, 'فایل پشتیبان خوانده نشد'))
      } finally {
        setLoading(false)
      }
    },
    [loading]
  )

  const start = useCallback(async () => {
    if (loading || !requireSpreadsheetId() || !mayRestore()) return

    const file = await pickFile(ZIP_ACCEPT)

    if (file) await startFrom(() => file.arrayBuffer())
  }, [loading, startFrom])

  const run = useCallback(async () => {
    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId || !preview) return

    setStage('running')
    setProgress({ done: 0, total: preview.tabs.length, tab: '' })

    const { RestoreAbortedError, runRestore } = await import('../../../services/backupRestore')

    try {
      setResult(formatRestoreReport(await runRestore(spreadsheetId, preview, mode, setProgress)))
    } catch (err) {
      const failure = err instanceof RestoreAbortedError ? err.failure : err

      // An expired sign-in opens the login prompt; the report still says what was written.
      if (isAuthError(failure)) handleSheetError(failure)

      const done = err instanceof RestoreAbortedError ? `\n${formatRestoreReport(err.report)}` : ''

      setResult(`بازیابی متوقف شد: ${toUserMessage(failure, RESTORE_ERROR)}${done}`)
    }
    setStage('done')
  }, [preview, mode])

  const close = useCallback(() => {
    if (stage === 'running') return
    setStage('closed')
    setPreview(null)
    setProgress(null)
  }, [stage])

  return {
    start,
    startFrom,
    loading,
    modal: {
      stage,
      preview,
      mode,
      progress,
      result,
      onModeChange: setMode,
      onNext: () => setStage('confirm'),
      onBack: () => setStage('preview'),
      onConfirm: run,
      onClose: close
    }
  }
}
