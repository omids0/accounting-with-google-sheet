import { useState } from 'react'

import type { WalletAccountWithRow, WalletFormState } from './types'
import { buildWalletAccountPayload, createWalletAccountFromForm } from './walletAccountCreate'
import { deleteAccountSmsTemplates } from '../../services/bankSmsTemplates'
import { getSettings, isConfigured } from '../../services/settings'
import {
  deleteWalletAccount,
  loadWalletPeriodFlow,
  updateWalletAccount,
  type WalletPeriodFlow
} from '../../services/wallet'
import { logBalanceSet } from '../../services/walletLedger'
import { postReconciliationRecord } from '../../services/walletReconcileRecord'
import { requireAuth, requireSpreadsheetId } from '../../utils/authGuard'
import { roundMoney } from '../../utils/roundMoney'
import { handleSheetError } from '../../utils/sheetError'
import { showError, showSuccess } from '../../utils/toast'
import type { SmsTemplateDraft } from '../bankSms/SmsSampleEditor'

type UseWalletMutationsParams = {
  items: WalletAccountWithRow[]
  setItems: React.Dispatch<React.SetStateAction<WalletAccountWithRow[]>>
  balances: Record<string, number | ''>
  setBalances: React.Dispatch<React.SetStateAction<Record<string, number | ''>>>
  syncBalances: (accounts: WalletAccountWithRow[]) => void
  periodFlow: WalletPeriodFlow | null
  setPeriodFlow: React.Dispatch<React.SetStateAction<WalletPeriodFlow | null>>
  loadItems: () => Promise<void>
  expandedId: string | null
  setExpandedId: React.Dispatch<React.SetStateAction<string | null>>
}

export function useWalletMutations({
  setItems,
  balances,
  syncBalances,
  periodFlow,
  setPeriodFlow,
  loadItems,
  expandedId,
  setExpandedId
}: UseWalletMutationsParams) {
  const [showForm, setShowForm] = useState(false)

  const [editingAccount, setEditingAccount] = useState<WalletAccountWithRow | null>(null)

  const [deletingAccount, setDeletingAccount] = useState<WalletAccountWithRow | null>(null)

  const [saving, setSaving] = useState(false)

  const [deleting, setDeleting] = useState(false)

  const [savingId, setSavingId] = useState('')

  const [savingOpening, setSavingOpening] = useState(false)

  /** Sample-SMS templates added while creating an account; saved once it has an id. */
  const [smsDrafts, setSmsDrafts] = useState<SmsTemplateDraft[]>([])

  const openCreateForm = () => {
    setEditingAccount(null)
    setSmsDrafts([])
    setShowForm(true)
  }

  const openEditForm = (account: WalletAccountWithRow) => {
    setEditingAccount(account)
    setSmsDrafts([])
    setShowForm(true)
  }

  const closeForm = () => {
    if (saving) return
    setShowForm(false)
    setEditingAccount(null)
    setSmsDrafts([])
  }

  const openDeleteConfirm = (account: WalletAccountWithRow) => {
    setDeletingAccount(account)
  }

  const closeDeleteConfirm = () => {
    if (deleting) return
    setDeletingAccount(null)
  }

  const handleSubmit = async (form: WalletFormState) => {
    if (!isConfigured() || !requireAuth()) return

    const settings = getSettings()!

    setSaving(true)
    try {
      if (editingAccount) {
        const payload = buildWalletAccountPayload(form)

        await updateWalletAccount(settings.spreadsheetId, {
          ...editingAccount,
          ...payload
        })
        await logBalanceSet(
          settings.spreadsheetId,
          editingAccount.id,
          editingAccount.balance,
          payload.balance,
          'اصلاح دستی'
        )
        showSuccess('حساب ویرایش شد')
        await loadItems()
      } else {
        await createWalletAccountFromForm(settings.spreadsheetId, form, smsDrafts)
        showSuccess('حساب جدید اضافه شد')
        await loadItems()
      }
      closeForm()
    } catch (err) {
      if (
        handleSheetError(err, {
          fallbackMessage: editingAccount ? 'خطا در ویرایش حساب' : 'خطا در ثبت حساب'
        })
      )
        return
    } finally {
      setSaving(false)
    }
  }

  const handleBalanceSave = async (account: WalletAccountWithRow) => {
    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    const nextBalance = balances[account.id]

    if (nextBalance === '' || nextBalance < 0) {
      showError('موجودی نامعتبر است')
      syncBalances([account])

      return
    }
    if (nextBalance === account.balance) return

    setSavingId(account.id)
    try {
      const updated = await updateWalletAccount(spreadsheetId, {
        ...account,
        balance: nextBalance
      })

      await logBalanceSet(spreadsheetId, account.id, account.balance, nextBalance, 'اصلاح دستی')

      setItems(prev =>
        prev
          .map(item =>
            item.id === account.id ? { ...updated, rowNumber: account.rowNumber } : item
          )
          .sort((a, b) => b.balance - a.balance)
      )
      showSuccess(`موجودی «${account.title}» ذخیره شد`)
    } catch (err) {
      if (handleSheetError(err, { fallbackMessage: 'خطا در ذخیره موجودی' })) return
      syncBalances([account])
    } finally {
      setSavingId('')
    }
  }

  /**
   * Opening balances are derived, so a wallet/ledger gap is closed by recording
   * a real adjustment entry instead of silently rewriting the period anchor.
   */
  const handleReconcileBalance = async (difference: number) => {
    if (!periodFlow || roundMoney(difference) === 0) return

    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    setSavingOpening(true)
    try {
      await postReconciliationRecord(spreadsheetId, difference, periodFlow.monthLabel)

      const settings = getSettings()!
      const flow = await loadWalletPeriodFlow(settings)

      setPeriodFlow(flow)
      showSuccess('رکورد اصلاح موجودی ثبت شد')
    } catch (err) {
      if (handleSheetError(err, { fallbackMessage: 'خطا در ثبت اصلاح موجودی' })) return
    } finally {
      setSavingOpening(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingAccount) return

    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    setDeleting(true)
    try {
      await deleteWalletAccount(spreadsheetId, deletingAccount.rowNumber)
      await deleteAccountSmsTemplates(spreadsheetId, deletingAccount.id)
      if (expandedId === deletingAccount.id) setExpandedId(null)
      setDeletingAccount(null)
      showSuccess('حساب حذف شد')
      await loadItems()
    } catch (err) {
      if (handleSheetError(err, { fallbackMessage: 'خطا در حذف حساب' })) return
    } finally {
      setDeleting(false)
    }
  }

  return {
    showForm,
    editingAccount,
    deletingAccount,
    saving,
    deleting,
    savingId,
    savingOpening,
    smsDrafts,
    setSmsDrafts,
    openCreateForm,
    openEditForm,
    closeForm,
    openDeleteConfirm,
    closeDeleteConfirm,
    handleSubmit,
    handleBalanceSave,
    handleReconcileBalance,
    handleDelete
  }
}
