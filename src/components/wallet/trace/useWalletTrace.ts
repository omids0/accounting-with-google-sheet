import { useCallback, useEffect, useState } from 'react'

import { useDataRefresh } from '../../../hooks/useDataRefresh'
import { getSettings } from '../../../services/settings'
import { postReconciliationRecord } from '../../../services/walletReconcileRecord'
import { readTraceAcks, writeTraceAcks } from '../../../services/walletTraceAcks'
import { loadWalletTrace, type WalletTraceResult } from '../../../services/walletTraceLoad'
import { requireAuth, requireSpreadsheetId } from '../../../utils/authGuard'
import { handleSheetError } from '../../../utils/sheetError'
import { showSuccess } from '../../../utils/toast'

type TraceState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; result: WalletTraceResult }

/** Loads the trace of the wallet difference; «تأیید کردم» is remembered per spreadsheet. */
export function useWalletTrace() {
  const revision = useDataRefresh()
  const spreadsheetId = getSettings()?.spreadsheetId ?? ''
  const [state, setState] = useState<TraceState>({ status: 'loading' })
  const [acked, setAcked] = useState(() => readTraceAcks(spreadsheetId))
  const [posting, setPosting] = useState(false)

  const load = useCallback(async () => {
    const settings = getSettings()

    if (!settings?.spreadsheetId || !requireAuth()) {
      setState({ status: 'error' })

      return
    }
    try {
      setState({ status: 'ready', result: await loadWalletTrace(settings) })
    } catch (err) {
      handleSheetError(err, { fallbackMessage: 'خواندن اطلاعات انجام نشد' })
      setState({ status: 'error' })
    }
  }, [])

  // A background sync changes `revision`: refresh in place, without flashing the skeleton.
  useEffect(() => {
    void load()
  }, [load, revision])

  const reload = useCallback(() => {
    setState({ status: 'loading' })
    void load()
  }, [load])

  const toggleAck = useCallback(
    (id: string) => {
      const next = new Set(acked)
      const added = !next.delete(id)

      if (added) next.add(id)
      writeTraceAcks(spreadsheetId, next)
      setAcked(next)
      showSuccess(added ? 'به «تأییدشده» رفت؛ مقدار اختلاف همان می‌ماند' : 'به فهرست اول برگشت')
    },
    [acked, spreadsheetId]
  )

  /** «ثبت اصلاح»: the record the wallet page's button writes too. Resolves `true` when written. */
  const postCorrection = useCallback(async (): Promise<boolean> => {
    if (state.status !== 'ready') return false

    const id = requireSpreadsheetId()

    if (!id) return false
    setPosting(true)
    try {
      await postReconciliationRecord(id, state.result.report.difference, state.result.monthLabel)
      showSuccess('رکورد اصلاح موجودی ثبت شد')
      await load()

      return true
    } catch (err) {
      handleSheetError(err, { fallbackMessage: 'خطا در ثبت اصلاح موجودی' })

      return false
    } finally {
      setPosting(false)
    }
  }, [state, load])

  return { state, reload, acked, toggleAck, posting, postCorrection }
}

export type WalletTrace = ReturnType<typeof useWalletTrace>
