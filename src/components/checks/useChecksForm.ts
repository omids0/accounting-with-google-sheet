import { useState } from 'react'

import type { CheckFormState, CheckWithRow } from './types'
import { CHECKS_SHEET, createCheck, updateCheck } from '../../services/checks'
import { getSettings, isConfigured } from '../../services/settings'
import type { Check } from '../../types'
import { requireAuth } from '../../utils/authGuard'
import { handleSheetError } from '../../utils/sheetError'
import { showSuccess } from '../../utils/toast'
import { useAttachmentDrafts } from '../attachments/useAttachmentDrafts'
import { showSavedForCheck } from '../nudges/saveNudges'
import { useReadOnly } from '../ui/readOnly'

type UseChecksFormOptions = {
  onSaved: () => Promise<void>
}

export function useChecksForm({ onSaved }: UseChecksFormOptions) {
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<CheckWithRow | null>(null)
  const [saving, setSaving] = useState(false)

  const attachments = useAttachmentDrafts({
    open: showForm,
    resetKey: editingItem?.id ?? 'new',
    fileIds: editingItem?.attachments,
    entityId: editingItem?.id
  })

  const readOnly = useReadOnly()

  const openCreateForm = () => {
    if (readOnly) return
    setEditingItem(null)
    setShowForm(true)
  }

  const openEditForm = (item: CheckWithRow) => {
    if (readOnly) return
    setEditingItem(item)
    setShowForm(true)
  }

  const closeForm = () => {
    if (saving) return
    setShowForm(false)
    setEditingItem(null)
  }

  const handleSubmit = async (form: CheckFormState) => {
    if (!isConfigured() || !requireAuth()) return

    const settings = getSettings()!

    setSaving(true)
    try {
      if (editingItem) {
        const updated: Check = {
          ...editingItem,
          checkNumber: form.checkNumber.trim(),
          subCategory: form.subCategory.trim(),
          counterparty: form.counterparty.trim(),
          amount: Number(form.amount),
          creationDate: form.creationDate,
          dueDate: form.dueDate
        }

        await updateCheck(settings.spreadsheetId, editingItem.rowNumber, updated)
        await attachments.commit(settings.spreadsheetId, CHECKS_SHEET, editingItem.id)
        showSuccess('چک ویرایش شد')
      } else {
        const created = await createCheck(settings.spreadsheetId, {
          checkNumber: form.checkNumber.trim(),
          subCategory: form.subCategory.trim(),
          counterparty: form.counterparty.trim(),
          amount: Number(form.amount),
          creationDate: form.creationDate,
          dueDate: form.dueDate
        })

        await attachments.commit(settings.spreadsheetId, CHECKS_SHEET, created.id)
        showSavedForCheck('چک جدید ثبت شد', form.counterparty)
      }
      closeForm()
      await onSaved()
    } catch (err) {
      if (
        handleSheetError(err, {
          fallbackMessage: editingItem ? 'خطا در ویرایش چک' : 'خطا در ثبت چک'
        })
      )
        return
    } finally {
      setSaving(false)
    }
  }

  return {
    showForm,
    editingItem,
    saving,
    openCreateForm,
    openEditForm,
    closeForm,
    handleSubmit,
    attachments
  }
}
