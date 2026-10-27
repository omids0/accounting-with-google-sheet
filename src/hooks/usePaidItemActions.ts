import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from 'react'

import { removeParentAttachments, useAttachmentDeleteQuestion } from './useAttachmentDeleteQuestion'
import { useSheetImportExport } from './useSheetImportExport'
import { useUndoableDelete } from './useUndoableDelete'
import { useSettleFlow } from '../components/settle/useSettleFlow'
import { useReadOnly } from '../components/ui/readOnly'
import type { ImportPreview } from '../services/importExport'
import type { SettleOptions, UnlinkChoice } from '../services/settleOptions'
import { isLinkedForeignRecord, type SettlePrefix } from '../services/settleRecords'
import { requireSpreadsheetId } from '../utils/authGuard'
import { confirmDelete, undoableDeleteMessage } from '../utils/confirmDelete'
import { linkedDeleteQuestion, type LinkedRecordKind } from '../utils/linkedRecordsDelete'
import { handleSheetError } from '../utils/sheetError'
import { showSuccess } from '../utils/toast'

type ImportExportFns = {
  exportFn: (spreadsheetId: string) => Promise<string | null>
  exportPdfFn: (spreadsheetId: string) => Promise<string | null>
  importFn: (spreadsheetId: string, csvContent: string) => Promise<ImportPreview>
}

/** How marking an item paid asks for the account and catches a payment recorded already. */
export type SettleConfig<T> = {
  /** A function when each item decides (a check is paid or received). */
  type: 'expense' | 'income' | ((item: T) => 'expense' | 'income')
  titleFor: (item: T) => string
  amountFor: (item: T) => number
  dateFor?: (item: T) => string
  /** What saving does, when it is not obvious (shown under the sheet title). */
  noteFor?: (item: T) => string | undefined
  /** True for an item bridged to the personal spreadsheet (the settle sheet asks for its account). */
  bridgeFor?: (item: T) => boolean
  /** The record the item's payment is linked to, if any. */
  recordIdOf: (item: T) => string | undefined
  /** Title prefix(es) of the records this app creates for the module («بدهی: »). */
  prefix: SettlePrefix
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
  deleteItem: (
    spreadsheetId: string,
    rowNumber: number,
    item: T,
    /** The «رکوردهای مالی مرتبط هم حذف شوند» box left off: keep the records the item's payment made. */
    keepLinkedRecords?: boolean
  ) => Promise<void>
  sortItems: (items: T[]) => T[]
  /** Names the row in the undo toast, e.g. «چک ۱۲۳۴۵۶». */
  deleteLabel: (item: T) => string
  deleteErrorMessage: string
  onBeforeDelete?: (item: T) => void
  /** Drive ids of an item's receipts: deleting it then asks «پیوست هم پاک شود؟». */
  attachmentIds?: (item: T) => readonly string[] | undefined
  /** How many income/expense records the item made: the delete question then offers to delete them too. */
  linkedRecordCount?: (item: T) => number
  /** Whether those records are income or expense (default: either), so the question names them truthfully. */
  linkedRecordKind?: (item: T) => LinkedRecordKind
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
  linkedRecordCount,
  linkedRecordKind,
  importExport
}: UsePaidItemActionsOptions<T>) {
  const [togglingId, setTogglingId] = useState('')
  const readOnly = useReadOnly()
  const settleFlow = useSettleFlow()

  const getSpreadsheetId = useCallback(() => requireSpreadsheetId(), [])

  const handleTogglePaid = async (item: T, paid: boolean) => {
    if (readOnly) return

    const spreadsheetId = getSpreadsheetId()

    if (!spreadsheetId) return

    let options: SettleOptions | null | undefined
    let unlink: UnlinkChoice | null | undefined

    const settleType = typeof settle?.type === 'function' ? settle.type(item) : settle?.type

    if (settle && settleType && paid) {
      options = await settleFlow.askSettle({
        type: settleType,
        title: settle.titleFor(item),
        amount: settle.amountFor(item),
        date: settle.dateFor?.(item),
        note: settle.noteFor?.(item),
        bridge: settle.bridgeFor?.(item),
        linkedIds: settle.linkedIds
      })
      if (!options) return
    } else if (!paid) {
      const recordId = settle?.recordIdOf(item) ?? ''

      // Un-ticking deletes the linked expense/income and undoes the wallet balance: confirm first.
      if (!(await settleFlow.askUnpay(Boolean(recordId)))) return

      if (
        settle &&
        settleType &&
        (await isLinkedForeignRecord(spreadsheetId, settleType, recordId, settle.prefix))
      ) {
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
      showSuccess(paid ? 'پرداخت ثبت شد' : 'پرداخت برگردانده شد')
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
    if (readOnly) return

    const spreadsheetId = getSpreadsheetId()

    if (!spreadsheetId) return

    const label = deleteLabel(item)
    const confirmed = await confirmDelete(
      linkedDeleteQuestion(
        label,
        undoableDeleteMessage(label),
        linkedRecordCount?.(item) ?? 0,
        linkedRecordKind?.(item)
      )
    )

    if (!confirmed) return

    const answer = await attachmentQuestion.ask(attachmentIds?.(item) ?? [])

    if (!answer) return

    void undoableDelete.schedule({
      id: item.id,
      label,
      errorMessage: deleteErrorMessage,
      commit: async () => {
        const current = itemsRef.current.find(entry => entry.id === item.id) ?? item

        await deleteItem(spreadsheetId, current.rowNumber, current, !confirmed.checked)
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
