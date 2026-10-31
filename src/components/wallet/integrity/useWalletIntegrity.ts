import { useCallback, useEffect, useState } from 'react'

import { useDataRefresh } from '../../../hooks/useDataRefresh'
import type { AccountIntegrity, IntegrityReport } from '../../../services/integrityCheck'
import { postIntegrityCorrection } from '../../../services/integrityFix'
import { loadIntegrityReport } from '../../../services/integrityLoad'
import { getSettings } from '../../../services/settings'
import { requireAuth, requireSpreadsheetId } from '../../../utils/authGuard'
import { handleSheetError } from '../../../utils/sheetError'
import { showError, showSuccess } from '../../../utils/toast'

type IntegrityState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; report: IntegrityReport }

/** Runs «بررسی یکپارچگی» on open and again on demand; the only write is the confirmed fix. */
export function useWalletIntegrity() {
  const revision = useDataRefresh()
  const [state, setState] = useState<IntegrityState>({ status: 'loading' })
  const [fixingId, setFixingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const settings = getSettings()

    if (!settings?.spreadsheetId || !requireAuth()) {
      setState({ status: 'error' })

      return
    }
    try {
      setState({ status: 'ready', report: await loadIntegrityReport(settings) })
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

  /** Resolves `true` when the row was written (the confirm dialog may close). */
  const fix = useCallback(
    async (account: AccountIntegrity): Promise<boolean> => {
      const id = requireSpreadsheetId()

      if (!id) return false
      setFixingId(account.accountId)
      try {
        const result = await postIntegrityCorrection(id, account.accountId, account.difference)

        if (result === 'fixed') showSuccess('یک ردیف اصلاحی به گردش حساب اضافه شد')
        else showError('اختلاف این حساب در این فاصله عوض شده؛ چیزی ثبت نشد. نتیجهٔ تازه را ببین.')
        await load()

        return result === 'fixed'
      } catch (err) {
        handleSheetError(err, { fallbackMessage: 'ثبت ردیف اصلاحی انجام نشد' })

        return false
      } finally {
        setFixingId(null)
      }
    },
    [load]
  )

  return { state, reload, fix, fixingId }
}

export type WalletIntegrity = ReturnType<typeof useWalletIntegrity>
