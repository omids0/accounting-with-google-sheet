import { useState } from 'react'

import type { DangSplitGroupFormState, DangSplitGroupWithRow } from './types'
import {
  createDangSplitGroup,
  ensureDangSplitSheets,
  updateDangSplitGroup
} from '../../services/dangSplit'
import { requireSpreadsheetId } from '../../utils/authGuard'
import { showError, showSuccess } from '../../utils/toast'

export function useDangSplitGroupForm({ onSaved }: { onSaved: () => Promise<void> | void }) {
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<DangSplitGroupWithRow | null>(null)
  const [saving, setSaving] = useState(false)

  const openCreateForm = () => {
    setEditingItem(null)
    setShowForm(true)
  }

  const openEditForm = (item: DangSplitGroupWithRow) => {
    setEditingItem(item)
    setShowForm(true)
  }

  const closeForm = () => {
    if (saving) return
    setShowForm(false)
    setEditingItem(null)
  }

  const handleSubmit = async (values: DangSplitGroupFormState) => {
    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    const title = values.title.trim()

    if (!title) {
      showError('عنوان گروه دنگ لازم است')

      return
    }

    setSaving(true)
    try {
      await ensureDangSplitSheets(spreadsheetId)

      const payload = { title, description: values.description.trim() }

      if (editingItem) {
        await updateDangSplitGroup(spreadsheetId, editingItem.rowNumber, {
          ...editingItem,
          ...payload
        })
        showSuccess('گروه دنگ ویرایش شد')
      } else {
        await createDangSplitGroup(spreadsheetId, payload)
        showSuccess('گروه دنگ ثبت شد')
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

  return { showForm, editingItem, saving, openCreateForm, openEditForm, closeForm, handleSubmit }
}
