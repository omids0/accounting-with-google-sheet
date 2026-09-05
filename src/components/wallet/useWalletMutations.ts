import { useState } from 'react'

import type { WalletAccountWithRow, WalletFormState } from './types'
import { setOpeningBalance } from '../../services/monthlyBalance'
import { getSettings, isConfigured } from '../../services/settings'
import {
  createWalletAccount,
  deleteWalletAccount,
  loadWalletPeriodFlow,
  updateWalletAccount,
  type WalletPeriodFlow
} from '../../services/wallet'
import { requireAuth, requireSpreadsheetId } from '../../utils/authGuard'
import { handleSheetError } from '../../utils/sheetError'
import { showError, showSuccess } from '../../utils/toast'

type UseWalletMutationsParams = {
  items: WalletAccountWithRow[]
  setItems: React.Dispatch<React.SetStateAction<WalletAccountWithRow[]>>
  balances: Record<string, number | ''>
  setBalances: React.Dispatch<React.SetStateAction<Record<string, number | ''>>>
  syncBalances: (accounts: WalletAccountWithRow[]) => void
  periodFlow: WalletPeriodFlow | null
  setPeriodFlow: React.Dispatch<React.SetStateAction<WalletPeriodFlow | null>>
  openingInput: number | ''
  setOpeningInput: React.Dispatch<React.SetStateAction<number | ''>>
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
  openingInput,
  setOpeningInput,
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

  const openCreateForm = () => {
    setEditingAccount(null)
    setShowForm(true)
  }

  const openEditForm = (account: WalletAccountWithRow) => {
    setEditingAccount(account)
    setShowForm(true)
  }

  const closeForm = () => {
    if (saving) return
    setShowForm(false)
    setEditingAccount(null)
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

    if (!form.title.trim()) {
      showError('عنوان الزامی است')

      return
    }
    if (form.balance === '' || Number(form.balance) < 0) {
      showError('موجودی را وارد کنید')

      return
    }

    const settings = getSettings()!

    setSaving(true)
    try {
      if (editingAccount) {
        await updateWalletAccount(settings.spreadsheetId, {
          ...editingAccount,
          title: form.title.trim(),
          balance: Number(form.balance),
          note: form.note.trim()
        })
        showSuccess('حساب ویرایش شد')
        await loadItems()
      } else {
        await createWalletAccount(settings.spreadsheetId, {
          title: form.title.trim(),
          balance: Number(form.balance),
          note: form.note.trim()
        })
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

  const handleSaveOpeningBalance = async () => {
    if (!periodFlow) return

    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    setSavingOpening(true)
    try {
      const amount = openingInput === '' ? 0 : Number(openingInput)

      await setOpeningBalance(spreadsheetId, periodFlow.monthKey, amount)

      const settings = getSettings()!
      const flow = await loadWalletPeriodFlow(settings)

      setPeriodFlow(flow)
      setOpeningInput(flow.openingBalance || '')
      showSuccess('موجودی اول دوره ذخیره شد')
    } catch (err) {
      if (handleSheetError(err, { fallbackMessage: 'خطا در ذخیره موجودی اول' })) return
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
    openCreateForm,
    openEditForm,
    closeForm,
    openDeleteConfirm,
    closeDeleteConfirm,
    handleSubmit,
    handleBalanceSave,
    handleSaveOpeningBalance,
    handleDelete
  }
}
