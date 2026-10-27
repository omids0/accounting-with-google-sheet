import { useRef, useState } from 'react'

import type { DangSplitPersonFormState, DangSplitPersonWithRow } from './types'
import type { UndoableDelete } from '../../hooks/useUndoableDelete'
import { deleteDangSplitPersonCascade } from '../../services/dangSplitBundle'
import {
  addDangSplitPersonDeposit,
  createDangSplitPerson,
  updateDangSplitPerson
} from '../../services/dangSplitPeople'
import { requireSpreadsheetId } from '../../utils/authGuard'
import { confirmDelete, undoableDeleteMessage } from '../../utils/confirmDelete'
import { showError, showSuccess } from '../../utils/toast'
import { toUserMessage } from '../../utils/userMessage'

export function useDangSplitPersonActions({
  groupId,
  items,
  scheduleDelete,
  onSaved
}: {
  groupId: string
  /** Unfiltered people, so a delayed delete always sees the latest copy of its row. */
  items: DangSplitPersonWithRow[]
  scheduleDelete: (entry: UndoableDelete) => Promise<void>
  onSaved: () => Promise<void> | void
}) {
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<DangSplitPersonWithRow | null>(null)
  const [saving, setSaving] = useState(false)
  const itemsRef = useRef(items)
  const [assigningItem, setAssigningItem] = useState<DangSplitPersonWithRow | null>(null)
  const [leavingItem, setLeavingItem] = useState<DangSplitPersonWithRow | null>(null)
  const [savingCategory, setSavingCategory] = useState(false)
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
      showError(toUserMessage(err, 'ذخیره ناموفق بود'))
    } finally {
      setSaving(false)
    }
  }

  itemsRef.current = items

  const requestDelete = async (item: DangSplitPersonWithRow) => {
    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    const label = item.name ? `«${item.name}»` : 'فرد'
    const confirmed = await confirmDelete({
      label,
      message: undoableDeleteMessage(`${label} با سهمش از هزینه‌ها`)
    })

    if (!confirmed) return

    void scheduleDelete({
      id: item.id,
      label,
      errorMessage: 'حذف ناموفق بود',
      commit: async () => {
        const current = itemsRef.current.find(entry => entry.id === item.id) ?? item

        await deleteDangSplitPersonCascade(spreadsheetId, current)
        await onSaved()
      }
    })
  }

  /** تغییر دسته یک فرد؛ شناسه خالی یعنی از دسته خارج شود */
  const saveCategory = async (person: DangSplitPersonWithRow, categoryId: string) => {
    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    setSavingCategory(true)
    try {
      await updateDangSplitPerson(spreadsheetId, person.rowNumber, { ...person, categoryId })
      setAssigningItem(null)
      setLeavingItem(null)
      showSuccess(categoryId ? 'فرد به دسته اضافه شد' : 'فرد از دسته خارج شد')
      await onSaved()
    } catch (err) {
      showError(toUserMessage(err, 'تغییر دسته ناموفق بود'))
    } finally {
      setSavingCategory(false)
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
      showError(toUserMessage(err, 'ثبت شارژ ناموفق بود'))
    } finally {
      setSavingDepositId(null)
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
    requestDelete,
    assigningItem,
    leavingItem,
    savingCategory,
    openAssignCategory: setAssigningItem,
    closeAssignCategory: () => setAssigningItem(null),
    openLeaveCategory: setLeavingItem,
    closeLeaveCategory: () => setLeavingItem(null),
    saveCategory,
    depositPersonId,
    savingDepositId,
    openDepositForm: setDepositPersonId,
    closeDepositForm: () => setDepositPersonId(null),
    handleDeposit
  }
}
