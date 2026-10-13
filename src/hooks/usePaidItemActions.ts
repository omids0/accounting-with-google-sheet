import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from 'react'

import { removeParentAttachments, useAttachmentDeleteQuestion } from './useAttachmentDeleteQuestion'
import { useSheetImportExport } from './useSheetImportExport'
import { useUndoableDelete } from './useUndoableDelete'
import type { ImportPreview } from '../services/importExport'
import { requireSpreadsheetId } from '../utils/authGuard'
import { handleSheetError } from '../utils/sheetError'

type ImportExportFns = {
  exportFn: (spreadsheetId: string) => Promise<string | null>
  exportPdfFn: (spreadsheetId: string) => Promise<string | null>
  importFn: (spreadsheetId: string, csvContent: string) => Promise<ImportPreview>
}

type UsePaidItemActionsOptions<T extends { id: string; rowNumber: number }> = {
  items: T[]
  setItems: Dispatch<SetStateAction<T[]>>
  loadItems: () => Promise<void>
  togglePaid: (spreadsheetId: string, item: T, paid: boolean) => Promise<Omit<T, 'rowNumber'>>
  deleteItem: (spreadsheetId: string, rowNumber: number, item: T) => Promise<void>
  sortItems: (items: T[]) => T[]
  /** Names the row in the undo toast, e.g. «چک ۱۲۳۴۵۶». */
  deleteLabel: (item: T) => string
  deleteErrorMessage: string
  onBeforeDelete?: (item: T) => void
  /** Drive ids of an item's receipts: deleting it then asks «پیوست هم پاک شود؟». */
  attachmentIds?: (item: T) => readonly string[] | undefined
  importExport: ImportExportFns
}

export function usePaidItemActions<T extends { id: string; rowNumber: number }>({
  items,
  setItems,
  loadItems,
  togglePaid,
  deleteItem,
  sortItems,
  deleteLabel,
  deleteErrorMessage,
  onBeforeDelete,
  attachmentIds,
  importExport
}: UsePaidItemActionsOptions<T>) {
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

  const undoableDelete = useUndoableDelete()
  // Rows shift after every delete; the write looks its row up again by id.
  const itemsRef = useRef(items)

  itemsRef.current = items

  const attachmentQuestion = useAttachmentDeleteQuestion()

  const requestDelete = async (item: T) => {
    const spreadsheetId = getSpreadsheetId()

    if (!spreadsheetId) return

    const answer = await attachmentQuestion.ask(attachmentIds?.(item) ?? [])

    if (!answer) return

    void undoableDelete.schedule({
      id: item.id,
      label: deleteLabel(item),
      errorMessage: deleteErrorMessage,
      commit: async () => {
        const current = itemsRef.current.find(entry => entry.id === item.id) ?? item

        await deleteItem(spreadsheetId, current.rowNumber, current)
        onBeforeDelete?.(current)
        void removeParentAttachments(attachmentIds?.(current), answer)
        await loadItems()
      }
    })
  }

  const { handleExport, handleExportPdf, handleImport, importExportConfirmModal } =
    useSheetImportExport({
      ...importExport,
      onComplete: loadItems
    })

  return {
    /** The list minus the row waiting in the undo window. */
    visibleItems: undoableDelete.visible(items),
    togglingId,
    handleTogglePaid,
    requestDelete,
    handleExport,
    handleExportPdf,
    handleImport,
    importExportConfirmModal,
    attachmentQuestionModal: attachmentQuestion.modalProps
  }
}
