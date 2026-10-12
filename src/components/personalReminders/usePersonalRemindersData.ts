import { useCallback, useEffect, useRef, useState } from 'react'

import type { PersonalReminderWithRow } from './types'
import { useDataRefresh } from '../../hooks/useDataRefresh'
import { useSheetImportExport } from '../../hooks/useSheetImportExport'
import { useUndoableDelete } from '../../hooks/useUndoableDelete'
import { syncCategoriesFromSheet, getPersonalReminderCategories } from '../../services/categories'
import {
  completePersonalReminder,
  deletePersonalReminder,
  ensurePersonalRemindersSheet,
  fetchPersonalReminders,
  getPersonalReminderCompletionMessage,
  sortPersonalReminders
} from '../../services/personalReminders'
import {
  exportPersonalRemindersCsv,
  exportPersonalRemindersPdf,
  importPersonalRemindersCsv
} from '../../services/personalRemindersSheetIO'
import { getSettings, isConfigured } from '../../services/settings'
import { hasStoreData } from '../../services/spreadsheetStore'
import { requireSpreadsheetId } from '../../utils/authGuard'
import { handleSheetError } from '../../utils/sheetError'
import { showError, showSuccess } from '../../utils/toast'
import { toUserMessage } from '../../utils/userMessage'

export function usePersonalRemindersData() {
  const [items, setItems] = useState<PersonalReminderWithRow[]>([])
  const [loading, setLoading] = useState(() => {
    const settings = getSettings()

    return !(settings?.spreadsheetId && hasStoreData(settings.spreadsheetId))
  })
  const [completingItem, setCompletingItem] = useState<PersonalReminderWithRow | null>(null)
  const [completingId, setCompletingId] = useState('')
  const [categories, setCategories] = useState<string[]>(() => getPersonalReminderCategories())

  const dataRevision = useDataRefresh()

  const undoableDelete = useUndoableDelete()
  // Rows shift after every delete; writes look their row up again by id.
  const itemsRef = useRef(items)

  itemsRef.current = items

  const loadItems = useCallback(async () => {
    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    setLoading(true)
    try {
      await ensurePersonalRemindersSheet(spreadsheetId)
      await syncCategoriesFromSheet(spreadsheetId)
      setCategories(getPersonalReminderCategories())

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

  const requestDelete = (item: PersonalReminderWithRow) => {
    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    const title = item.title.trim()

    void undoableDelete.schedule({
      id: item.id,
      label: title ? `یادآوری «${title}»` : 'یادآوری',
      errorMessage: 'حذف ناموفق بود',
      commit: async () => {
        const current = itemsRef.current.find(entry => entry.id === item.id) ?? item

        await deletePersonalReminder(spreadsheetId, current.rowNumber)
        await loadItems()
      }
    })
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
      const current = itemsRef.current.find(item => item.id === completingItem.id) ?? completingItem
      const updated = await completePersonalReminder(spreadsheetId, current)

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
      showError(toUserMessage(err, 'ثبت انجام ناموفق بود'))
    } finally {
      setCompletingId('')
    }
  }

  const { handleExport, handleExportPdf, handleImport, importExportConfirmModal } =
    useSheetImportExport({
      exportFn: exportPersonalRemindersCsv,
      exportPdfFn: exportPersonalRemindersPdf,
      importFn: importPersonalRemindersCsv,
      onComplete: loadItems
    })

  return {
    /** The list minus the row waiting in the undo window. */
    items: undoableDelete.visible(items),
    categories,
    setCategories,
    loading,
    completingItem,
    completingId,
    completionMessage: completingItem
      ? getPersonalReminderCompletionMessage(completingItem.recurrence)
      : '',
    loadItems,
    requestDelete,
    openCompleteConfirm,
    closeCompleteConfirm,
    handleComplete,
    handleExport,
    handleExportPdf,
    handleImport,
    importExportConfirmModal
  }
}
