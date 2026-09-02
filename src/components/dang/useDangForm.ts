import { useState } from 'react'

import type { DangFormState, DangWithRow } from './types'
import { isTokenValid } from '../../services/auth'
import { createDang, updateDang } from '../../services/dang'
import { getSettings, isConfigured } from '../../services/settings'
import type { Dang } from '../../types'
import { getTodayIso } from '../../utils/jalaliDate'
import { showError, showSuccess } from '../../utils/toast'

type UseDangFormOptions = {
  categories: string[]
  onReauth?: () => void
  onSaved: () => Promise<void>
}

export function useDangForm({ categories, onReauth, onSaved }: UseDangFormOptions) {
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<DangWithRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<DangFormState>({
    title: '',
    category: '',
    counterparty: '',
    amount: '',
    date: getTodayIso(),
    note: ''
  })

  const resetCreateForm = () => {
    setForm({
      title: '',
      category: categories[0] ?? '',
      counterparty: '',
      amount: '',
      date: getTodayIso(),
      note: ''
    })
  }

  const openCreateForm = () => {
    setEditingItem(null)
    resetCreateForm()
    setShowForm(true)
  }

  const openEditForm = (item: DangWithRow) => {
    setEditingItem(item)
    setForm({
      title: item.title,
      category: item.category,
      counterparty: item.counterparty,
      amount: item.amount,
      date: item.date,
      note: item.note
    })
    setShowForm(true)
  }

  const closeForm = () => {
    if (saving) return
    setShowForm(false)
    setEditingItem(null)
    resetCreateForm()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConfigured() || !isTokenValid()) {
      onReauth?.()

      return
    }

    if (!form.title.trim()) {
      showError('عنوان الزامی است')

      return
    }
    if (!form.category.trim()) {
      showError('دسته‌بندی الزامی است')

      return
    }
    if (!form.counterparty.trim()) {
      showError('طرف حساب الزامی است')

      return
    }
    if (!form.amount || Number(form.amount) <= 0) {
      showError('مبلغ را وارد کنید')

      return
    }
    if (!form.date) {
      showError('تاریخ الزامی است')

      return
    }

    const settings = getSettings()!

    setSaving(true)
    try {
      if (editingItem) {
        const updated: Dang = {
          ...editingItem,
          title: form.title.trim(),
          category: form.category.trim(),
          counterparty: form.counterparty.trim(),
          amount: Number(form.amount),
          date: form.date,
          note: form.note.trim()
        }

        await updateDang(settings.spreadsheetId, editingItem.rowNumber, updated)
        showSuccess('بدهی ویرایش شد')
      } else {
        await createDang(settings.spreadsheetId, {
          title: form.title.trim(),
          category: form.category.trim(),
          counterparty: form.counterparty.trim(),
          amount: Number(form.amount),
          date: form.date,
          note: form.note.trim()
        })
        showSuccess('بدهی جدید ثبت شد')
      }
      closeForm()
      await onSaved()
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : editingItem ? 'خطا در ویرایش بدهی' : 'خطا در ثبت بدهی'

      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.()

        return
      }
      showError(msg)
    } finally {
      setSaving(false)
    }
  }

  return {
    showForm,
    editingItem,
    saving,
    form,
    setForm,
    openCreateForm,
    openEditForm,
    closeForm,
    handleSubmit
  }
}
