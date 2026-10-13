import { useCallback, useRef, useState } from 'react'

import { useCloseYearData } from './useCloseYearData'
import { useBackupDownload } from '../../hooks/useBackupDownload'
import { archiveYearRecords, writeNextYearOpening } from '../../services/closeYearActions'
import { patchCloseYearState } from '../../services/closeYearStore'
import { haptic } from '../../utils/haptics'
import { handleSheetError } from '../../utils/sheetError'
import { showError, showSuccess } from '../../utils/toast'

export interface ArchiveProgress {
  done: number
  total: number
}

/** «بستن سال <year>»: the derived step marks plus the three actions and the cash tick. */
export function useCloseYear(year: number) {
  const data = useCloseYearData(year)
  const backup = useBackupDownload()
  const [busy, setBusy] = useState<'opening' | 'archive' | null>(null)
  const [progress, setProgress] = useState<ArchiveProgress | null>(null)
  const busyRef = useRef(false)
  const { settings, spreadsheetId, forms, reloadOpening, reloadArchive } = data

  const run = useCallback(async (kind: 'opening' | 'archive', task: () => Promise<void>) => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(kind)
    try {
      await task()
    } finally {
      busyRef.current = false
      setBusy(null)
      setProgress(null)
    }
  }, [])

  const writeOpening = useCallback(
    () =>
      run('opening', async () => {
        if (!settings) return
        try {
          await writeNextYearOpening(settings, year)
          await reloadOpening()
          haptic('success')
          showSuccess('مانده‌های اول فروردین ثبت شد')
        } catch (err) {
          handleSheetError(err, { fallbackMessage: 'خطا در ثبت مانده‌ها' })
        }
      }),
    [run, settings, year, reloadOpening]
  )

  const archiveYear = useCallback(
    () =>
      run('archive', async () => {
        if (!spreadsheetId) return
        try {
          const moved = await archiveYearRecords(spreadsheetId, forms, year, (done, total) =>
            setProgress({ done, total })
          )

          await reloadArchive()
          if (moved) {
            haptic('success')
            showSuccess('رکوردها آرشیو شد')
          } else {
            showError('رکوردی جابه‌جا نشد؛ بعداً دوباره امتحان کن.')
          }
        } catch (err) {
          handleSheetError(err, { fallbackMessage: 'خطا در آرشیو رکوردها' })
        }
      }),
    [run, spreadsheetId, forms, year, reloadArchive]
  )

  const confirmCash = useCallback(
    (checked: boolean) => patchCloseYearState(spreadsheetId, year, { cashConfirmed: checked }),
    [spreadsheetId, year]
  )

  return { ...data, busy, progress, writeOpening, archiveYear, confirmCash, backup }
}

export type CloseYearWizard = ReturnType<typeof useCloseYear>
