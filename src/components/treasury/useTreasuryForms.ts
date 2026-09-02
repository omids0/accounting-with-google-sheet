import { useState } from 'react'

import type { TransactionWithRow, VaultFormState } from './types'
import { formatQuantity } from './utils'
import { isTokenValid } from '../../services/auth'
import { getSettings, isConfigured } from '../../services/settings'
import {
  createVaultTransaction,
  deleteVaultTransaction,
  updateVaultTransaction
} from '../../services/treasury'
import type { VaultAssetType } from '../../types'
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
  onReauth: (() => void) | undefined,
  loadItems: () => Promise<void>
) {
  const [showForm, setShowForm] = useState(false)
  const [editingTx, setEditingTx] = useState<TransactionWithRow | null>(null)
  const [deletingTx, setDeletingTx] = useState<TransactionWithRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [sellForm, setSellForm] = useState<VaultFormState | null>(null)
  const [sellingAsset, setSellingAsset] = useState<VaultAssetType | null>(null)
  const [form, setForm] = useState<VaultFormState>(createEmptyBuyForm)

  const resetCreateForm = () => {
    setForm(createEmptyBuyForm())
  }

  const openCreateForm = () => {
    setEditingTx(null)
    resetCreateForm()
    setShowForm(true)
  }

  const openEditForm = (tx: TransactionWithRow) => {
    setEditingTx(tx)
    setForm({
      assetType: tx.assetType,
      quantity: tx.quantity,
      unitPrice: tx.unitPrice,
      transactionDate: tx.transactionDate,
      note: tx.note
    })
    setShowForm(true)
  }

  const closeForm = () => {
    if (saving) return
    setShowForm(false)
    setEditingTx(null)
    resetCreateForm()
  }

  const openDeleteConfirm = (tx: TransactionWithRow) => {
    setDeletingTx(tx)
  }

  const closeDeleteConfirm = () => {
    if (deleting) return
    setDeletingTx(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConfigured() || !isTokenValid()) {
      onReauth?.()

      return
    }

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
          onReauth,
          fallbackMessage: editingTx ? 'خطا در ویرایش' : 'خطا در ثبت'
        })
      )
        return
    } finally {
      setSaving(false)
    }
  }

  const handleSell = async (assetType: VaultAssetType, available: number) => {
    if (!sellForm || sellForm.assetType !== assetType) return

    if (!isConfigured() || !isTokenValid()) {
      onReauth?.()

      return
    }

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
      setSellForm(null)
      showSuccess('فروش ثبت شد')
      await loadItems()
    } catch (err) {
      if (handleSheetError(err, { onReauth, fallbackMessage: 'خطا در ثبت فروش' })) return
    } finally {
      setSellingAsset(null)
    }
  }

  const handleDelete = async () => {
    if (!deletingTx) return

    if (!isConfigured() || !isTokenValid()) {
      onReauth?.()

      return
    }

    const settings = getSettings()!

    setDeleting(true)
    try {
      await deleteVaultTransaction(settings.spreadsheetId, deletingTx.rowNumber)
      setDeletingTx(null)
      showSuccess('تراکنش حذف شد')
      await loadItems()
    } catch (err) {
      if (handleSheetError(err, { onReauth, fallbackMessage: 'خطا در حذف تراکنش' })) return
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
    sellForm,
    setSellForm,
    sellingAsset,
    form,
    setForm,
    openCreateForm,
    openEditForm,
    closeForm,
    openDeleteConfirm,
    closeDeleteConfirm,
    handleSubmit,
    handleSell,
    handleDelete
  }
}
