import { useState } from 'react'

import type { CounterpartyFormState, CounterpartyWithRow } from './types'
import { createCounterparty, updateCounterparty } from '../../services/counterparties'
import { requireSpreadsheetId } from '../../utils/authGuard'
import { showError, showSuccess } from '../../utils/toast'

type UseCounterpartiesFormOptions = {
  onSaved: () => Promise<void> | void
}

function normalizePhones(phones: CounterpartyFormState['phones']) {
  return phones.map(phone => ({ number: phone.number.trim() })).filter(phone => phone.number)
}

function normalizeAccounts(accounts: CounterpartyFormState['accounts']) {
  return accounts
    .map(account => ({
      bankName: account.bankName.trim(),
      accountNumber: account.accountNumber.trim()
    }))
    .filter(account => account.bankName || account.accountNumber)
}

export function useCounterpartiesForm({ onSaved }: UseCounterpartiesFormOptions) {
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<CounterpartyWithRow | null>(null)
  const [saving, setSaving] = useState(false)

  const openCreateForm = () => {
    setEditingItem(null)
    setShowForm(true)
  }

  const openEditForm = (item: CounterpartyWithRow) => {
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

    if (!values.firstName.trim()) {
      showError('نام الزامی است')

      return
    }
    if (!values.lastName.trim()) {
      showError('نام خانوادگی الزامی است')

      return
    }

    const payload = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      birthDate: values.birthDate,
      address: values.address.trim(),
      location: values.location,
      phones: normalizePhones(values.phones),
      accounts: normalizeAccounts(values.accounts),
      note: values.note.trim()
    }

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
      showError(err instanceof Error ? err.message : 'ذخیره ناموفق بود')
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
