import { useCallback, useState, type Dispatch, type SetStateAction } from 'react'

import { useSheetImportExport } from './useSheetImportExport'
import type { ImportResult } from '../services/importExport'
import { requireSpreadsheetId } from '../utils/authGuard'
import { handleSheetError } from '../utils/sheetError'
import { showSuccess } from '../utils/toast'

type ImportExportFns = {
  exportFn: (spreadsheetId: string) => Promise<void>
  exportPdfFn: (spreadsheetId: string) => Promise<void>
  importFn: (spreadsheetId: string, csvContent: string) => Promise<ImportResult>
}

type UsePaidItemActionsOptions<T extends { id: string; rowNumber: number }> = {
  setItems: Dispatch<SetStateAction<T[]>>
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

  const getSpreadsheetId = useCallback(() => requireSpreadsheetId(), [])

  const handleTogglePaid = async (item: T, paid: boolean) => {
    const spreadsheetId = getSpreadsheetId()

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
      handleSheetError(err, { fallbackMessage: 'خطا در به‌روزرسانی' })
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

    const spreadsheetId = getSpreadsheetId()

    if (!spreadsheetId) return

    setDeleting(true)
    try {
      await deleteItem(spreadsheetId, deletingItem.rowNumber, deletingItem)
      onBeforeDelete?.(deletingItem)
      setDeletingItem(null)
      showSuccess(deleteSuccessMessage)
      await loadItems()
    } catch (err) {
      handleSheetError(err, { fallbackMessage: deleteErrorMessage })
    } finally {
      setDeleting(false)
    }
  }

  const { handleExport, handleExportPdf, handleImport, importExportConfirmModal } =
    useSheetImportExport({
      ...importExport,
      onComplete: loadItems
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
