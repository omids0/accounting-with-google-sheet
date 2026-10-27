import { useCallback, useState } from 'react'

import { canTransferBetween, type TransferDraft } from './transferForm'
import { useTransferAccounts } from './useTransferAccounts'
import { useWorkspaceType } from '../../../hooks/useWorkspaceType'
import { getSettings, isConfigured } from '../../../services/settings'
import { createTransfer, TransferWriteError } from '../../../services/transfers'
import { requireAuth } from '../../../utils/authGuard'
import { handleSheetError } from '../../../utils/sheetError'
import { showSuccess } from '../../../utils/toast'

/** A half-done transfer needs the user to read and act, so its message stays up longer. */
export const UNFINISHED_TRANSFER_TOAST_MS = 10000

/**
 * «انتقال بین حساب‌ها»: the form that moves money between two wallet accounts and the entry points
 * that open it. `canTransfer` is false outside the personal book (the service refuses there) and
 * with fewer than two accounts, so a page offers the action only when it can work.
 */
export function useTransferModal() {
  const personal = useWorkspaceType() === 'personal'
  const accounts = useTransferAccounts(personal && isConfigured())
  /** `null` closed; otherwise the account «از حساب» starts on ('' = none). */
  const [fromAccountId, setFromAccountId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const canTransfer = personal && isConfigured() && canTransferBetween(accounts)

  const openTransfer = useCallback((from = '') => setFromAccountId(from), [])
  const close = useCallback(() => setFromAccountId(null), [])

  const submit = useCallback(async (draft: TransferDraft) => {
    const spreadsheetId = getSettings()?.spreadsheetId

    if (!spreadsheetId || !requireAuth()) return

    setSaving(true)
    try {
      await createTransfer({
        spreadsheetId,
        fromAccountId: draft.fromAccountId,
        toAccountId: draft.toAccountId,
        amount: Number(draft.amount),
        date: draft.date,
        note: draft.note
      })
      showSuccess('انتقال ثبت شد')
      setFromAccountId(null)
    } catch (err) {
      // Unfinished (not taken back): the balances may differ from the page, so say it for long.
      const unfinished = err instanceof TransferWriteError && !err.rolledBack

      handleSheetError(err, {
        fallbackMessage: 'خطا در ثبت انتقال',
        duration: unfinished ? UNFINISHED_TRANSFER_TOAST_MS : undefined
      })
    } finally {
      setSaving(false)
    }
  }, [])

  return {
    canTransfer,
    openTransfer,
    modalProps: {
      open: fromAccountId !== null,
      initialFromId: fromAccountId ?? '',
      accounts,
      saving,
      onClose: close,
      onSubmit: submit
    }
  }
}
