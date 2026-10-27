import { useCallback, useEffect, useState } from 'react'

import { transferDeleteQuestion } from './transferDelete'
import { useTransferAccounts } from './useTransferAccounts'
import { useDataRefresh } from '../../../hooks/useDataRefresh'
import { useWorkspaceType } from '../../../hooks/useWorkspaceType'
import { getSettings, isConfigured } from '../../../services/settings'
import { deleteTransfer, fetchTransfers, type Transfer } from '../../../services/transfers'
import { requireAuth } from '../../../utils/authGuard'
import { confirmDelete } from '../../../utils/confirmDelete'
import { handleSheetError } from '../../../utils/sheetError'
import { showSuccess } from '../../../utils/toast'

/** «انتقال‌ها»: every transfer, newest first, and the delete of one (it reverses both balances). */
export function useTransfers() {
  const personal = useWorkspaceType() === 'personal'
  const accounts = useTransferAccounts(personal)
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const revision = useDataRefresh()

  const reload = useCallback(async () => {
    const spreadsheetId = getSettings()?.spreadsheetId

    if (!spreadsheetId || !personal) return setLoading(false)

    try {
      setTransfers(await fetchTransfers(spreadsheetId))
    } catch (err) {
      handleSheetError(err, { fallbackMessage: 'خطا در بارگذاری انتقال‌ها' })
    } finally {
      setLoading(false)
    }
  }, [personal])

  useEffect(() => {
    if (isConfigured()) void reload()
  }, [reload, revision])

  const remove = useCallback(
    async (transfer: Transfer) => {
      const spreadsheetId = getSettings()?.spreadsheetId

      if (!spreadsheetId || !requireAuth()) return

      const confirmed = await confirmDelete(transferDeleteQuestion(transfer, accounts))

      if (!confirmed) return

      setDeletingId(transfer.id)
      try {
        await deleteTransfer(spreadsheetId, transfer.id)
        await reload()
        showSuccess('انتقال حذف شد')
      } catch (err) {
        handleSheetError(err, { fallbackMessage: 'خطا در حذف انتقال' })
      } finally {
        setDeletingId(null)
      }
    },
    [accounts, reload]
  )

  return { transfers, accounts, loading, deletingId, reload, remove }
}
