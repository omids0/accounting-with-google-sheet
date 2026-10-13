import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from 'react'

import { removeParentAttachments, useAttachmentDeleteQuestion } from './useAttachmentDeleteQuestion'
import { useSheetImportExport } from './useSheetImportExport'
import { useUndoableDelete } from './useUndoableDelete'
import { useSettleFlow } from '../components/settle/useSettleFlow'
import type { ImportPreview } from '../services/importExport'
import type { SettleOptions, UnlinkChoice } from '../services/settleOptions'
import { isLinkedForeignRecord } from '../services/settleRecords'
import { requireSpreadsheetId } from '../utils/authGuard'
import { handleSheetError } from '../utils/sheetError'

type ImportExportFns = {
  exportFn: (spreadsheetId: string) => Promise<string | null>
  exportPdfFn: (spreadsheetId: string) => Promise<string | null>
  importFn: (spreadsheetId: string, csvContent: string) => Promise<ImportPreview>
}

/** How marking an item paid asks for the account and catches a payment recorded already. */
export type SettleConfig<T> = {
  type: 'expense' | 'income'
  titleFor: (item: T) => string
  amountFor: (item: T) => number
  dateFor?: (item: T) => string
  /** The record the item's payment is linked to, if any. */
  recordIdOf: (item: T) => string | undefined
  /** Title prefix of the records this app creates for the module («بدهی: »). */
  prefix: string
  /** `transactionRecordId` of every item: those records are settlements already. */
  linkedIds: readonly string[]
}

type UsePaidItemActionsOptions<T extends { id: string; rowNumber: number }> = {
  items: T[]
  setItems: Dispatch<SetStateAction<T[]>>
  loadItems: () => Promise<void>
  togglePaid: (
    spreadsheetId: string,
    item: T,
    paid: boolean,
    options?: SettleOptions,
    unlink?: UnlinkChoice
  ) => Promise<Omit<T, 'rowNumber'>>
  /** Without it paying records the expense silently, as before. */
  settle?: SettleConfig<T>
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
  settle,
  deleteItem,
  sortItems,
  deleteLabel,
  deleteErrorMessage,
  onBeforeDelete,
  attachmentIds,
  importExport
}: UsePaidItemActionsOptions<T>) {
  const [togglingId, setTogglingId] = useState('')
  const settleFlow = useSettleFlow()

  const getSpreadsheetId = useCallback(() => requireSpreadsheetId(), [])

  const handleTogglePaid = async (item: T, paid: boolean) => {
    const spreadsheetId = getSpreadsheetId()

    if (!spreadsheetId) return

    let options: SettleOptions | null | undefined
    let unlink: UnlinkChoice | null | undefined

    if (settle && paid) {
      options = await settleFlow.askSettle({
        type: settle.type,
        title: settle.titleFor(item),
        amount: settle.amountFor(item),
        date: settle.dateFor?.(item),
        linkedIds: settle.linkedIds
      })
      if (!options) return
    } else if (settle) {
      const recordId = settle.recordIdOf(item) ?? ''

      if (await isLinkedForeignRecord(spreadsheetId, settle.type, recordId, settle.prefix)) {
        unlink = await settleFlow.askUnlink()
        if (!unlink) return
      }
    }

    setTogglingId(item.id)
    try {
      const updated = await togglePaid(
        spreadsheetId,
        item,
        paid,
        options ?? undefined,
        unlink ?? undefined
      )

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
    attachmentQuestionModal: attachmentQuestion.modalProps,
    settleFlow
  }
}
