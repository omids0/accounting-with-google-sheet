import { useRef, useState } from 'react'

import type { ReceivableFormState, ReceivableWithRow } from './types'
import { useUndoableDelete } from '../../hooks/useUndoableDelete'
import {
  createReceivable,
  deleteReceivable,
  paidAmount,
  saveReceivableFields
} from '../../services/receivables'
import { getSettings, isConfigured } from '../../services/settings'
import { requireAuth, requireSpreadsheetId } from '../../utils/authGuard'
import { confirmDelete, undoableDeleteMessage } from '../../utils/confirmDelete'
import { linkedDeleteQuestion, receivableLinkedCount } from '../../utils/linkedRecordsDelete'
import { handleSheetError } from '../../utils/sheetError'
import { showError, showSuccess } from '../../utils/toast'
import { showSavedForCounterparty } from '../nudges/saveNudges'

type UseReceivableFormActionsParams = {
  items: ReceivableWithRow[]
  loadItems: () => Promise<void>
  setExpandedId: React.Dispatch<React.SetStateAction<string | null>>
  clearPaymentForms: () => void
}

export function useReceivableFormActions({
  items,
  loadItems,
  setExpandedId,
  clearPaymentForms
}: UseReceivableFormActionsParams) {
  const [showForm, setShowForm] = useState(false)

  const [editingItem, setEditingItem] = useState<ReceivableWithRow | null>(null)

  const [saving, setSaving] = useState(false)

  const openCreateForm = () => {
    setEditingItem(null)
    setShowForm(true)
  }

  const openEditForm = (item: ReceivableWithRow) => {
    setEditingItem(item)
    setShowForm(true)
  }

  const closeForm = () => {
    if (saving) return
    setShowForm(false)
    setEditingItem(null)
  }

  const handleSubmit = async (form: ReceivableFormState) => {
    if (!isConfigured() || !requireAuth()) return

    const settings = getSettings()!

    setSaving(true)
    try {
      if (editingItem) {
        const nextAmount = Number(form.amount)

        if (nextAmount < paidAmount(editingItem)) {
          showError('مبلغ نمی‌تواند کمتر از مجموع پرداخت‌ها باشد')

          return
        }

        const updated = {
          ...editingItem,
          title: form.title.trim(),
          debtor: form.debtor.trim(),
          category: form.category.trim(),
          subCategory: form.subCategory.trim(),
          amount: nextAmount,
          borrowDate: form.borrowDate,
          note: form.note.trim()
        }

        await saveReceivableFields(settings.spreadsheetId, updated)
        showSuccess('طلب ویرایش شد')
      } else {
        await createReceivable(settings.spreadsheetId, {
          title: form.title.trim(),
          debtor: form.debtor.trim(),
          category: form.category.trim(),
          subCategory: form.subCategory.trim(),
          amount: Number(form.amount),
          borrowDate: form.borrowDate,
          note: form.note.trim()
        })
        showSavedForCounterparty('طلب جدید ثبت شد', form.debtor)
      }
      closeForm()
      await loadItems()
    } catch (err) {
      if (
        handleSheetError(err, {
          fallbackMessage: editingItem ? 'خطا در ویرایش طلب' : 'خطا در ثبت طلب'
        })
      )
        return
    } finally {
      setSaving(false)
    }
  }

  const undoableDelete = useUndoableDelete()
  // Rows shift after every delete; the write looks its row up again by id.
  const itemsRef = useRef(items)

  itemsRef.current = items

  const requestDelete = async (item: ReceivableWithRow) => {
    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    const title = item.title.trim()
    const label = title ? `طلب «${title}»` : 'طلب'
    const confirmed = await confirmDelete(
      linkedDeleteQuestion(
        label,
        undoableDeleteMessage(`${label} با پرداخت‌هایش`),
        receivableLinkedCount(item)
      )
    )

    if (!confirmed) return

    setExpandedId(current => (current === item.id ? null : current))
    clearPaymentForms()
    void undoableDelete.schedule({
      id: item.id,
      label,
      errorMessage: 'خطا در حذف طلب',
      commit: async () => {
        const current = itemsRef.current.find(entry => entry.id === item.id) ?? item

        await deleteReceivable(spreadsheetId, current.rowNumber, current, !confirmed.checked)
        await loadItems()
      }
    })
  }

  return {
    showForm,
    editingItem,
    /** The list minus the row waiting in the undo window. */
    visibleItems: undoableDelete.visible(items),
    saving,
    openCreateForm,
    openEditForm,
    closeForm,
    handleSubmit,
    requestDelete
  }
}
