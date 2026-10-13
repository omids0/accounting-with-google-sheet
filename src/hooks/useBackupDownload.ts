import { useCallback, useRef, useState } from 'react'

import { useActiveSpreadsheetName } from './useActiveSpreadsheetName'
import { isAuthError } from '../services/auth'
import { requireSpreadsheetId } from '../utils/authGuard'
import { handleSheetError } from '../utils/sheetError'
import { showError, showSuccess } from '../utils/toast'
import { toExportErrorMessage } from '../utils/userMessage'

/** «دانلود پشتیبان کامل»: fflate and the backup code load only when it is pressed. */
export function useBackupDownload() {
  const spreadsheetLabel = useActiveSpreadsheetName()
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)

  const download = useCallback(async () => {
    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId || busyRef.current) return

    busyRef.current = true
    setBusy(true)
    try {
      const { createFullBackup } = await import('../services/backupExport')
      const name = await createFullBackup(spreadsheetId, spreadsheetLabel)

      if (name) showSuccess(`ذخیره شد: ${name}`)
    } catch (err) {
      if (isAuthError(err)) handleSheetError(err)
      else showError(toExportErrorMessage(err, 'خطا در ساخت پشتیبان'))
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }, [spreadsheetLabel])

  return { download, busy }
}
