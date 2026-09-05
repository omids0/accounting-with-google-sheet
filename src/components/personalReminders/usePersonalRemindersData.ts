import { useCallback, useEffect, useState } from 'react'

import type { PersonalReminderWithRow } from './types'
import { useDataRefresh } from '../../hooks/useDataRefresh'
import {
  completePersonalReminder,
  deletePersonalReminder,
  ensurePersonalRemindersSheet,
  fetchPersonalReminders,
  getPersonalReminderCompletionMessage,
  sortPersonalReminders
} from '../../services/personalReminders'
import { getSettings, isConfigured } from '../../services/settings'
import { hasStoreData } from '../../services/spreadsheetStore'
import { requireSpreadsheetId } from '../../utils/authGuard'
import { handleSheetError } from '../../utils/sheetError'
import { showError, showSuccess } from '../../utils/toast'

export function usePersonalRemindersData() {
  const [items, setItems] = useState<PersonalReminderWithRow[]>([])
  const [loading, setLoading] = useState(() => {
    const settings = getSettings()

    return !(settings?.spreadsheetId && hasStoreData(settings.spreadsheetId))
  })
  const [deletingItem, setDeletingItem] = useState<PersonalReminderWithRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [completingItem, setCompletingItem] = useState<PersonalReminderWithRow | null>(null)
  const [completingId, setCompletingId] = useState('')

  const dataRevision = useDataRefresh()

  const loadItems = useCallback(async () => {
    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    setLoading(true)
    try {
      await ensurePersonalRemindersSheet(spreadsheetId)
      const data = await fetchPersonalReminders(spreadsheetId)

      setItems(data)
    } catch (err) {
      handleSheetError(err, { fallbackMessage: 'خطا در بارگذاری یادآوری‌ها' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isConfigured()) return

    void loadItems()
  }, [loadItems, dataRevision])

  const openDeleteConfirm = (item: PersonalReminderWithRow) => {
    setDeletingItem(item)
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
      await deletePersonalReminder(spreadsheetId, deletingItem.rowNumber)
      setItems(current => current.filter(item => item.id !== deletingItem.id))
      setDeletingItem(null)
      showSuccess('یادآوری حذف شد')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'حذف ناموفق بود')
    } finally {
      setDeleting(false)
    }
  }

  const openCompleteConfirm = (item: PersonalReminderWithRow) => {
    setCompletingItem(item)
  }

  const closeCompleteConfirm = () => {
    if (completingId) return
    setCompletingItem(null)
  }

  const handleComplete = async () => {
    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId || !completingItem) return

    setCompletingId(completingItem.id)
    try {
      const updated = await completePersonalReminder(spreadsheetId, completingItem)

      setItems(current =>
        sortPersonalReminders(
          current.map(item =>
            item.id === updated.id ? { ...updated, rowNumber: item.rowNumber } : item
          )
        )
      )
      setCompletingItem(null)

      if (updated.enabled) {
        showSuccess('موعد بعدی ثبت شد')
      } else {
        showSuccess('یادآوری انجام‌شده علامت خورد')
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'ثبت انجام ناموفق بود')
    } finally {
      setCompletingId('')
    }
  }

  return {
    items,
    loading,
    deletingItem,
    deleting,
    completingItem,
    completingId,
    completionMessage: completingItem
      ? getPersonalReminderCompletionMessage(completingItem.recurrence)
      : '',
    loadItems,
    openDeleteConfirm,
    closeDeleteConfirm,
    handleDelete,
    openCompleteConfirm,
    closeCompleteConfirm,
    handleComplete
  }
}
