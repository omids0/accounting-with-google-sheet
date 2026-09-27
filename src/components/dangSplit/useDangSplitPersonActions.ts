import { useState } from 'react'

import type { DangSplitPersonFormState, DangSplitPersonWithRow } from './types'
import { deleteDangSplitPersonCascade } from '../../services/dangSplitBundle'
import {
  addDangSplitPersonDeposit,
  createDangSplitPerson,
  updateDangSplitPerson
} from '../../services/dangSplitPeople'
import { requireSpreadsheetId } from '../../utils/authGuard'
import { showError, showSuccess } from '../../utils/toast'

export function useDangSplitPersonActions({
  groupId,
  onSaved
}: {
  groupId: string
  onSaved: () => Promise<void> | void
}) {
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<DangSplitPersonWithRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingItem, setDeletingItem] = useState<DangSplitPersonWithRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [depositPersonId, setDepositPersonId] = useState<string | null>(null)
  const [savingDepositId, setSavingDepositId] = useState<string | null>(null)

  const openCreateForm = () => {
    setEditingItem(null)
    setShowForm(true)
  }

  const openEditForm = (item: DangSplitPersonWithRow) => {
    setEditingItem(item)
    setShowForm(true)
  }

  const closeForm = () => {
    if (saving) return
    setShowForm(false)
    setEditingItem(null)
  }

  const handleSubmit = async (values: DangSplitPersonFormState) => {
    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    const name = values.name.trim()

    if (!name) {
      showError('نام فرد لازم است')

      return
    }

    const defaultWeight = values.defaultWeight === '' ? 1 : Number(values.defaultWeight)
    const deposit = values.deposit === '' ? 0 : Number(values.deposit)

    if (!Number.isFinite(defaultWeight) || defaultWeight <= 0) {
      showError('ضریب باید عددی بزرگ‌تر از صفر باشد')

      return
    }

    if (!Number.isFinite(deposit) || deposit < 0) {
      showError('واریز به صندوق نمی‌تواند منفی باشد')

      return
    }

    setSaving(true)
    try {
      if (editingItem) {
        await updateDangSplitPerson(spreadsheetId, editingItem.rowNumber, {
          ...editingItem,
          name,
          categoryId: values.categoryId,
          defaultWeight,
          deposit,
          note: values.note.trim()
        })
        showSuccess('فرد ویرایش شد')
      } else {
        await createDangSplitPerson(spreadsheetId, {
          groupId,
          name,
          categoryId: values.categoryId,
          defaultWeight,
          deposit,
          note: values.note.trim()
        })
        showSuccess('فرد اضافه شد')
      }

      setShowForm(false)
      setEditingItem(null)
      await onSaved()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'ذخیره ناموفق بود')
    } finally {
      setSaving(false)
    }
  }

  const closeDeleteConfirm = () => {
    if (deleting) return
    setDeletingItem(null)
  }

  const handleDelete = async () => {
    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId || !deletingItem) return

    setDeleting(true)
    try {
      await deleteDangSplitPersonCascade(spreadsheetId, deletingItem)
      setDeletingItem(null)
      showSuccess('فرد حذف شد')
      await onSaved()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'حذف ناموفق بود')
    } finally {
      setDeleting(false)
    }
  }

  /** شارژ صندوق: مبلغ وارد شده به واریز قبلی همان فرد اضافه می‌شود */
  const handleDeposit = async (person: DangSplitPersonWithRow, amount: number | '') => {
    const spreadsheetId = requireSpreadsheetId()
    const value = amount === '' ? 0 : Number(amount)

    if (!spreadsheetId) return

    if (!Number.isFinite(value) || value <= 0) {
      showError('مبلغ شارژ باید بزرگ‌تر از صفر باشد')

      return
    }

    setSavingDepositId(person.id)
    try {
      await addDangSplitPersonDeposit(spreadsheetId, person, value)
      setDepositPersonId(null)
      showSuccess('صندوق شارژ شد')
      await onSaved()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'ثبت شارژ ناموفق بود')
    } finally {
      setSavingDepositId(null)
    }
  }

  return {
    showForm,
    editingItem,
    saving,
    deletingItem,
    deleting,
    openCreateForm,
    openEditForm,
    closeForm,
    handleSubmit,
    setDeletingItem,
    closeDeleteConfirm,
    handleDelete,
    depositPersonId,
    savingDepositId,
    openDepositForm: setDepositPersonId,
    closeDepositForm: () => setDepositPersonId(null),
    handleDeposit
  }
}
