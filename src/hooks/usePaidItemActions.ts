import { useCallback, useState, type Dispatch, type SetStateAction } from 'react'

import { useSheetImportExport } from './useSheetImportExport'
import { isTokenValid } from '../services/auth'
import type { ImportResult } from '../services/importExport'
import { getSettings } from '../services/settings'
import { handleSheetError } from '../utils/sheetError'
import { showSuccess } from '../utils/toast'

type ImportExportFns = {
  exportFn: (spreadsheetId: string) => Promise<void>
  exportPdfFn: (spreadsheetId: string) => Promise<void>
  importFn: (spreadsheetId: string, csvContent: string) => Promise<ImportResult>
}

type UsePaidItemActionsOptions<T extends { id: string; rowNumber: number }> = {
  setItems: Dispatch<SetStateAction<T[]>>
  onReauth?: () => void
  loadItems: () => Promise<void>
  togglePaid: (spreadsheetId: string, item: T, paid: boolean) => Promise<Omit<T, 'rowNumber'>>
  deleteItem: (spreadsheetId: string, rowNumber: number, item: T) => Promise<void>
  sortItems: (items: T[]) => T[]
  deleteSuccessMessage: string
  deleteErrorMessage: string
  onBeforeDelete?: (item: T) => void
  importExport: ImportExportFns
}

export function usePaidItemActions<T extends { id: string; rowNumber: number }>({
  setItems,
  onReauth,
  loadItems,
  togglePaid,
  deleteItem,
  sortItems,
  deleteSuccessMessage,
  deleteErrorMessage,
  onBeforeDelete,
  importExport
}: UsePaidItemActionsOptions<T>) {
  const [deletingItem, setDeletingItem] = useState<T | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState('')

  const requireSpreadsheetId = useCallback(() => {
    const settings = getSettings()

    if (!settings?.spreadsheetId || !isTokenValid()) {
      onReauth?.()

      return null
    }

    return settings.spreadsheetId
  }, [onReauth])

  const handleTogglePaid = async (item: T, paid: boolean) => {
    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    setTogglingId(item.id)
    try {
      const updated = await togglePaid(spreadsheetId, item, paid)

      setItems(prev =>
        sortItems(
          prev.map(current =>
            current.id === item.id ? ({ ...updated, rowNumber: item.rowNumber } as T) : current
          )
        )
      )
    } catch (err) {
      handleSheetError(err, { onReauth, fallbackMessage: 'خطا در به‌روزرسانی' })
    } finally {
      setTogglingId('')
    }
  }

  const openDeleteConfirm = (item: T) => {
    setDeletingItem(item)
  }

  const closeDeleteConfirm = () => {
    if (deleting) return
    setDeletingItem(null)
  }

  const handleDelete = async () => {
    if (!deletingItem) return

    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    setDeleting(true)
    try {
      await deleteItem(spreadsheetId, deletingItem.rowNumber, deletingItem)
      onBeforeDelete?.(deletingItem)
      setDeletingItem(null)
      showSuccess(deleteSuccessMessage)
      await loadItems()
    } catch (err) {
      handleSheetError(err, { onReauth, fallbackMessage: deleteErrorMessage })
    } finally {
      setDeleting(false)
    }
  }

  const { handleExport, handleExportPdf, handleImport, importExportConfirmModal } =
    useSheetImportExport({
      ...importExport,
      onComplete: loadItems,
      onReauth
    })

  return {
    deletingItem,
    deleting,
    togglingId,
    handleTogglePaid,
    openDeleteConfirm,
    closeDeleteConfirm,
    handleDelete,
    handleExport,
    handleExportPdf,
    handleImport,
    importExportConfirmModal
  }
}
