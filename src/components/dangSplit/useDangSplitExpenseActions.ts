import { useRef, useState } from 'react'

import type { DangSplitExpenseFormState, DangSplitExpenseWithRow } from './types'
import type { UndoableDelete } from '../../hooks/useUndoableDelete'
import { deleteDangSplitExpenseCascade } from '../../services/dangSplitBundle'
import {
  createDangSplitExpense,
  replaceDangSplitAllocations,
  updateDangSplitExpense
} from '../../services/dangSplitExpenses'
import type { DangSplitWeight } from '../../services/dangSplitMath'
import { requireSpreadsheetId } from '../../utils/authGuard'
import { confirmDelete, undoableDeleteMessage } from '../../utils/confirmDelete'
import { showError, showSuccess } from '../../utils/toast'
import { toUserMessage } from '../../utils/userMessage'

export function useDangSplitExpenseActions({
  groupId,
  items,
  scheduleDelete,
  onSaved
}: {
  groupId: string
  /** Unfiltered expenses, so a delayed delete always sees the latest copy of its row. */
  items: DangSplitExpenseWithRow[]
  scheduleDelete: (entry: UndoableDelete) => Promise<void>
  onSaved: () => Promise<void> | void
}) {
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<DangSplitExpenseWithRow | null>(null)
  const [saving, setSaving] = useState(false)
  const itemsRef = useRef(items)
  const [allocatingItem, setAllocatingItem] = useState<DangSplitExpenseWithRow | null>(null)
  const [savingAllocation, setSavingAllocation] = useState(false)

  const openCreateForm = () => {
    setEditingItem(null)
    setShowForm(true)
  }

  const openEditForm = (item: DangSplitExpenseWithRow) => {
    setEditingItem(item)
    setShowForm(true)
  }

  const closeForm = () => {
    if (saving) return
    setShowForm(false)
    setEditingItem(null)
  }

  const handleSubmit = async (values: DangSplitExpenseFormState, weights: DangSplitWeight[]) => {
    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    const title = values.title.trim()
    const amount = values.amount === '' ? 0 : Number(values.amount)

    if (!title) {
      showError('عنوان هزینه لازم است')

      return
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      showError('مبلغ هزینه باید بزرگ‌تر از صفر باشد')

      return
    }

    setSaving(true)
    try {
      if (editingItem) {
        await updateDangSplitExpense(spreadsheetId, editingItem.rowNumber, {
          ...editingItem,
          title,
          date: values.date,
          amount,
          payerId: values.payerId,
          note: values.note.trim()
        })
        await replaceDangSplitAllocations(spreadsheetId, {
          groupId,
          expenseId: editingItem.id,
          weights
        })
        showSuccess('هزینه ویرایش شد')
      } else {
        const created = await createDangSplitExpense(spreadsheetId, {
          groupId,
          title,
          date: values.date,
          amount,
          payerId: values.payerId,
          note: values.note.trim()
        })

        if (weights.length > 0) {
          await replaceDangSplitAllocations(spreadsheetId, {
            groupId,
            expenseId: created.id,
            weights
          })
        }

        showSuccess('هزینه ثبت شد')
      }

      setShowForm(false)
      setEditingItem(null)
      await onSaved()
    } catch (err) {
      showError(toUserMessage(err, 'ذخیره ناموفق بود'))
    } finally {
      setSaving(false)
    }
  }

  itemsRef.current = items

  const requestDelete = async (item: DangSplitExpenseWithRow) => {
    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    const label = item.title ? `هزینه «${item.title}»` : 'هزینه'
    const confirmed = await confirmDelete({
      label,
      message: undoableDeleteMessage(`${label} با تقسیمش بین افراد`)
    })

    if (!confirmed) return

    void scheduleDelete({
      id: item.id,
      label,
      errorMessage: 'حذف ناموفق بود',
      commit: async () => {
        const current = itemsRef.current.find(entry => entry.id === item.id) ?? item

        await deleteDangSplitExpenseCascade(spreadsheetId, current)
        await onSaved()
      }
    })
  }

  const closeAllocationModal = () => {
    if (savingAllocation) return
    setAllocatingItem(null)
  }

  const handleSaveAllocations = async (weights: DangSplitWeight[]) => {
    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId || !allocatingItem) return

    setSavingAllocation(true)
    try {
      await replaceDangSplitAllocations(spreadsheetId, {
        groupId,
        expenseId: allocatingItem.id,
        weights
      })
      setAllocatingItem(null)
      showSuccess('تخصیص افراد ذخیره شد')
      await onSaved()
    } catch (err) {
      showError(toUserMessage(err, 'ذخیره تخصیص ناموفق بود'))
    } finally {
      setSavingAllocation(false)
    }
  }

  return {
    showForm,
    editingItem,
    saving,
    allocatingItem,
    savingAllocation,
    openCreateForm,
    openEditForm,
    closeForm,
    handleSubmit,
    requestDelete,
    setAllocatingItem,
    closeAllocationModal,
    handleSaveAllocations
  }
}
