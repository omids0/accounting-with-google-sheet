import { useRef, useState } from 'react'

import type { TransactionWithRow, VaultFormState } from './types'
import { formatQuantity } from './utils'
import type { useUndoableDelete } from '../../hooks/useUndoableDelete'
import { getSettings, isConfigured } from '../../services/settings'
import {
  createVaultTransaction,
  deleteVaultTransaction,
  updateVaultTransaction
} from '../../services/treasury'
import type { VaultAssetType } from '../../types'
import { requireAuth } from '../../utils/authGuard'
import { getTodayIso } from '../../utils/jalaliDate'
import { handleSheetError } from '../../utils/sheetError'
import { showError, showSuccess } from '../../utils/toast'

function createEmptyBuyForm(): VaultFormState {
  return {
    assetType: 'sekeb',
    quantity: '',
    unitPrice: '',
    transactionDate: getTodayIso(),
    note: ''
  }
}

export function useTreasuryForms(
  loadItems: () => Promise<void>,
  transactions: TransactionWithRow[],
  undoableDelete: ReturnType<typeof useUndoableDelete>
) {
  const [showForm, setShowForm] = useState(false)
  const [editingTx, setEditingTx] = useState<TransactionWithRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [activeSellAsset, setActiveSellAsset] = useState<VaultAssetType | null>(null)
  const [sellingAsset, setSellingAsset] = useState<VaultAssetType | null>(null)
  // Rows shift after every delete; writes look their row up again by id.
  const transactionsRef = useRef(transactions)

  transactionsRef.current = transactions

  const openCreateForm = () => {
    setEditingTx(null)
    setShowForm(true)
  }

  const openEditForm = (tx: TransactionWithRow) => {
    setEditingTx(tx)
    setShowForm(true)
  }

  const closeForm = () => {
    if (saving) return
    setShowForm(false)
    setEditingTx(null)
  }

  const openSellForm = (assetType: VaultAssetType) => {
    setActiveSellAsset(assetType)
  }

  const closeSellForm = () => {
    setActiveSellAsset(null)
  }

  const handleSubmit = async (form: VaultFormState) => {
    if (!isConfigured() || !requireAuth()) return

    const qty = Number(form.quantity)

    if (!qty || qty <= 0) {
      showError('مقدار را وارد کنید')

      return
    }
    if (!form.unitPrice || Number(form.unitPrice) <= 0) {
      showError('قیمت واحد را وارد کنید')

      return
    }
    if (!form.transactionDate) {
      showError('تاریخ الزامی است')

      return
    }

    const settings = getSettings()!

    setSaving(true)
    try {
      if (editingTx) {
        const current = transactionsRef.current.find(tx => tx.id === editingTx.id) ?? editingTx

        await updateVaultTransaction(settings.spreadsheetId, current.rowNumber, {
          ...editingTx,
          assetType: form.assetType,
          quantity: qty,
          unitPrice: Number(form.unitPrice),
          transactionDate: form.transactionDate,
          note: form.note.trim()
        })
        showSuccess('خرید ویرایش شد')
      } else {
        await createVaultTransaction(settings.spreadsheetId, {
          assetType: form.assetType,
          action: 'buy',
          quantity: qty,
          unitPrice: Number(form.unitPrice),
          transactionDate: form.transactionDate,
          note: form.note.trim()
        })
        showSuccess('خرید ثبت شد')
      }
      closeForm()
      await loadItems()
    } catch (err) {
      if (
        handleSheetError(err, {
          fallbackMessage: editingTx ? 'خطا در ویرایش' : 'خطا در ثبت'
        })
      )
        return
    } finally {
      setSaving(false)
    }
  }

  const handleSell = async (
    assetType: VaultAssetType,
    available: number,
    sellForm: VaultFormState
  ) => {
    if (!isConfigured() || !requireAuth()) return

    const qty = Number(sellForm.quantity)

    if (!qty || qty <= 0) {
      showError('مقدار فروش را وارد کنید')

      return
    }
    if (!sellForm.unitPrice || Number(sellForm.unitPrice) <= 0) {
      showError('قیمت فروش را وارد کنید')

      return
    }
    if (!sellForm.transactionDate) {
      showError('تاریخ فروش الزامی است')

      return
    }
    if (qty > available) {
      showError(`موجودی کافی نیست. موجودی فعلی: ${formatQuantity(available, assetType)}`)

      return
    }

    const settings = getSettings()!

    setSellingAsset(assetType)
    try {
      await createVaultTransaction(settings.spreadsheetId, {
        assetType,
        action: 'sell',
        quantity: qty,
        unitPrice: Number(sellForm.unitPrice),
        transactionDate: sellForm.transactionDate,
        note: sellForm.note.trim()
      })
      closeSellForm()
      showSuccess('فروش ثبت شد')
      await loadItems()
    } catch (err) {
      if (handleSheetError(err, { fallbackMessage: 'خطا در ثبت فروش' })) return
    } finally {
      setSellingAsset(null)
    }
  }

  const requestDelete = (tx: TransactionWithRow) => {
    if (!isConfigured() || !requireAuth()) return

    const settings = getSettings()!

    void undoableDelete.schedule({
      id: tx.id,
      label: 'تراکنش صندوقچه',
      errorMessage: 'خطا در حذف تراکنش',
      commit: async () => {
        const current = transactionsRef.current.find(entry => entry.id === tx.id) ?? tx

        await deleteVaultTransaction(settings.spreadsheetId, current.rowNumber)
        await loadItems()
      }
    })
  }

  return {
    showForm,
    editingTx,
    saving,
    activeSellAsset,
    sellingAsset,
    openCreateForm,
    openEditForm,
    closeForm,
    openSellForm,
    closeSellForm,
    handleSubmit,
    handleSell,
    requestDelete
  }
}

export { createEmptyBuyForm }
