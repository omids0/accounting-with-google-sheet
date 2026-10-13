import { useCallback, useEffect, useRef, useState } from 'react'

import { useBackupState } from '../../../hooks/useBackupState'
import { isAuthError } from '../../../services/auth'
import type { DriveBackupFile } from '../../../services/autoBackupPlan'
import {
  deleteDriveBackup,
  downloadDriveBackup,
  getBackupFolder,
  listDriveBackups
} from '../../../services/driveBackups'
import { saveExportFile } from '../../../utils/saveFile'
import { handleSheetError } from '../../../utils/sheetError'
import { showError, showSuccess } from '../../../utils/toast'
import { toExportErrorMessage, toUserMessage } from '../../../utils/userMessage'

function reportError(err: unknown, fallback: string): void {
  if (isAuthError(err)) handleSheetError(err)
  else showError(toExportErrorMessage(err, fallback))
}

/**
 * «نسخه‌ها» on `/settings/backup`: this spreadsheet's zips in Drive › «پشتیبان»,
 * re-read after every backup; download, delete and «پشتیبان الان».
 */
export function useDriveBackups(spreadsheetId: string) {
  const state = useBackupState(spreadsheetId)
  const [files, setFiles] = useState<DriveBackupFile[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)

  const reload = useCallback(async () => {
    try {
      const folder = await getBackupFolder(spreadsheetId)

      setFiles(await listDriveBackups(spreadsheetId, folder.id))
      setLoadError('')
    } catch (err) {
      if (isAuthError(err)) handleSheetError(err)
      setFiles([])
      setLoadError(toUserMessage(err, 'نسخه‌های Drive خوانده نشد'))
    }
  }, [spreadsheetId])

  useEffect(() => {
    void reload()
  }, [reload, state.lastBackupAt])

  /** One action at a time; a second tap while one runs is ignored. */
  const guard = useCallback(async (task: () => Promise<void>) => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      await task()
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }, [])

  const download = useCallback(
    (file: DriveBackupFile) =>
      guard(async () => {
        try {
          const saved = await saveExportFile(file.name, await downloadDriveBackup(file.id), {
            dated: false
          })

          if (saved) showSuccess(`ذخیره شد: ${saved}`)
        } catch (err) {
          reportError(err, 'دانلود نسخه انجام نشد')
        }
      }),
    [guard]
  )

  const remove = useCallback(
    (file: DriveBackupFile) =>
      guard(async () => {
        try {
          await deleteDriveBackup(file.id)
          setFiles(current => current?.filter(item => item.id !== file.id) ?? null)
          showSuccess('نسخه از Drive حذف شد')
        } catch (err) {
          reportError(err, 'حذف نسخه انجام نشد')
        }
      }),
    [guard]
  )

  const backupNow = useCallback(
    () =>
      guard(async () => {
        try {
          const run = await import('../../../services/driveBackupRun')
          const { saved, driveError } = await run.backupNow(spreadsheetId)

          if (driveError !== undefined) reportError(driveError, 'نسخهٔ Drive ذخیره نشد')
          else
            showSuccess(
              saved ? `پشتیبان در Drive و این دستگاه ذخیره شد` : 'پشتیبان در Drive ذخیره شد'
            )
        } catch (err) {
          reportError(err, 'خطا در ساخت پشتیبان')
        }
        await reload()
      }),
    [guard, reload, spreadsheetId]
  )

  return { state, files, loadError, busy, download, remove, backupNow }
}
