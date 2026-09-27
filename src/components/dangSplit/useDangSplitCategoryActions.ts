import { useState } from 'react'

import type { DangSplitCategoryFormState, DangSplitCategoryWithRow } from './types'
import { deleteDangSplitCategoryCascade } from '../../services/dangSplitBundle'
import { createDangSplitCategory, updateDangSplitCategory } from '../../services/dangSplitPeople'
import { requireSpreadsheetId } from '../../utils/authGuard'
import { showError, showSuccess } from '../../utils/toast'

export function useDangSplitCategoryActions({
  groupId,
  onSaved
}: {
  groupId: string
  onSaved: () => Promise<void> | void
}) {
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<DangSplitCategoryWithRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingItem, setDeletingItem] = useState<DangSplitCategoryWithRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  const openCreateForm = () => {
    setEditingItem(null)
    setShowForm(true)
  }

  const openEditForm = (item: DangSplitCategoryWithRow) => {
    setEditingItem(item)
    setShowForm(true)
  }

  const closeForm = () => {
    if (saving) return
    setShowForm(false)
    setEditingItem(null)
  }

  const handleSubmit = async (values: DangSplitCategoryFormState) => {
    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    const title = values.title.trim()

    if (!title) {
      showError('عنوان دسته لازم است')

      return
    }

    setSaving(true)
    try {
      if (editingItem) {
        await updateDangSplitCategory(spreadsheetId, editingItem.rowNumber, {
          ...editingItem,
          title
        })
        showSuccess('دسته ویرایش شد')
      } else {
        await createDangSplitCategory(spreadsheetId, { groupId, title })
        showSuccess('دسته اضافه شد')
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
      await deleteDangSplitCategoryCascade(spreadsheetId, deletingItem)
      setDeletingItem(null)
      showSuccess('دسته حذف شد')
      await onSaved()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'حذف ناموفق بود')
    } finally {
      setDeleting(false)
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
    handleDelete
  }
}
