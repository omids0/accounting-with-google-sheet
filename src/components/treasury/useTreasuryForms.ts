import { useState } from 'react'

import type { TransactionWithRow, VaultFormState } from './types'
import { formatQuantity } from './utils'
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

export function useTreasuryForms(loadItems: () => Promise<void>) {
  const [showForm, setShowForm] = useState(false)
  const [editingTx, setEditingTx] = useState<TransactionWithRow | null>(null)
  const [deletingTx, setDeletingTx] = useState<TransactionWithRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [activeSellAsset, setActiveSellAsset] = useState<VaultAssetType | null>(null)
  const [sellingAsset, setSellingAsset] = useState<VaultAssetType | null>(null)

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

  const openDeleteConfirm = (tx: TransactionWithRow) => {
    setDeletingTx(tx)
  }

  const closeDeleteConfirm = () => {
    if (deleting) return
    setDeletingTx(null)
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
        await updateVaultTransaction(settings.spreadsheetId, editingTx.rowNumber, {
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

  const handleDelete = async () => {
    if (!deletingTx) return

    if (!isConfigured() || !requireAuth()) return

    const settings = getSettings()!

    setDeleting(true)
    try {
      await deleteVaultTransaction(settings.spreadsheetId, deletingTx.rowNumber)
      setDeletingTx(null)
      showSuccess('تراکنش حذف شد')
      await loadItems()
    } catch (err) {
      if (handleSheetError(err, { fallbackMessage: 'خطا در حذف تراکنش' })) return
    } finally {
      setDeleting(false)
    }
  }

  return {
    showForm,
    editingTx,
    deletingTx,
    saving,
    deleting,
    activeSellAsset,
    sellingAsset,
    openCreateForm,
    openEditForm,
    closeForm,
    openDeleteConfirm,
    closeDeleteConfirm,
    openSellForm,
    closeSellForm,
    handleSubmit,
    handleSell,
    handleDelete
  }
}

export { createEmptyBuyForm }
