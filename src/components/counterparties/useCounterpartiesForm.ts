import { useState } from 'react'

import { buildCounterpartyPayload, validateCounterpartyForm } from './counterpartyFormPayload'
import type { CounterpartyFormState, CounterpartyWithRow } from './types'
import { createCounterparty, updateCounterparty } from '../../services/counterparties'
import { requireSpreadsheetId } from '../../utils/authGuard'
import { showError, showSuccess } from '../../utils/toast'
import { toUserMessage } from '../../utils/userMessage'
import { useReadOnly } from '../ui/readOnly'

type UseCounterpartiesFormOptions = {
  onSaved: () => Promise<void> | void
}

export function useCounterpartiesForm({ onSaved }: UseCounterpartiesFormOptions) {
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<CounterpartyWithRow | null>(null)
  const [saving, setSaving] = useState(false)

  const readOnly = useReadOnly()

  const openCreateForm = () => {
    if (readOnly) return
    setEditingItem(null)
    setShowForm(true)
  }

  const openEditForm = (item: CounterpartyWithRow) => {
    if (readOnly) return
    setEditingItem(item)
    setShowForm(true)
  }

  const closeForm = () => {
    if (saving) return
    setShowForm(false)
    setEditingItem(null)
  }

  const handleSubmit = async (values: CounterpartyFormState) => {
    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    const validationError = validateCounterpartyForm(
      values,
      editingItem?.phones.map(phone => phone.number)
    )

    if (validationError) {
      showError(validationError)

      return
    }

    const payload = buildCounterpartyPayload(values)

    setSaving(true)
    try {
      if (editingItem) {
        await updateCounterparty(spreadsheetId, editingItem.rowNumber, {
          ...editingItem,
          ...payload
        })
        showSuccess('طرف حساب ویرایش شد')
      } else {
        await createCounterparty(spreadsheetId, payload)
        showSuccess('طرف حساب جدید ثبت شد')
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

  return {
    showForm,
    editingItem,
    saving,
    openCreateForm,
    openEditForm,
    closeForm,
    handleSubmit
  }
}
