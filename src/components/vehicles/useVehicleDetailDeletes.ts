import { useRef } from 'react'

import type { VehicleDeleteTarget } from './types'
import { deleteVehicleDetailItem, type HistoryWithRow } from './vehicleDetailMutations'
import { useUndoableDelete } from '../../hooks/useUndoableDelete'
import { deleteManualVehicleExpense } from '../../services/vehicleExpenseActions'
import type { VehicleActiveListItem, VehicleTransactionItem } from '../../types/vehicles'
import { requireSpreadsheetId } from '../../utils/authGuard'
import { confirmDelete, undoableDeleteMessage } from '../../utils/confirmDelete'

type VehicleDetailDeletesOptions = {
  activeItems: VehicleActiveListItem[]
  history: HistoryWithRow[]
  transactions: VehicleTransactionItem[]
  loadDetail: () => Promise<void>
}

// One undo slot for the whole screen, so ids are prefixed by list.
function activeKey(item: VehicleActiveListItem) {
  return `${item.kind}:${item.periodic?.id ?? item.deadline?.id ?? item.id}`
}

function targetKey(target: VehicleDeleteTarget) {
  return `${target.kind}:${target.item.id}`
}

function targetLabel(target: VehicleDeleteTarget) {
  if (target.kind === 'periodic') {
    return target.item.serviceType ? `سرویس «${target.item.serviceType}»` : 'سرویس'
  }

  if (target.kind === 'deadline') {
    return target.item.category ? `موعد «${target.item.category}»` : 'موعد'
  }

  return 'رکورد تاریخچه'
}

/** Rows shift after every delete, so the write looks its row up again by id. */
function findFreshTarget(
  target: VehicleDeleteTarget,
  activeItems: VehicleActiveListItem[],
  history: HistoryWithRow[]
): VehicleDeleteTarget | null {
  if (target.kind === 'history') {
    const item = history.find(entry => entry.id === target.item.id)

    return item ? { kind: 'history', item } : null
  }

  const match = activeItems.find(entry => activeKey(entry) === targetKey(target))

  if (target.kind === 'periodic') {
    return match?.periodic ? { kind: 'periodic', item: match.periodic } : null
  }

  return match?.deadline ? { kind: 'deadline', item: match.deadline } : null
}

export function useVehicleDetailDeletes({
  activeItems,
  history,
  transactions,
  loadDetail
}: VehicleDetailDeletesOptions) {
  const undoableDelete = useUndoableDelete()
  const { pendingId } = undoableDelete
  const dataRef = useRef({ activeItems, history })

  dataRef.current = { activeItems, history }

  const scheduleTargetDelete = (target: VehicleDeleteTarget, withLinkedExpense: boolean) => {
    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    void undoableDelete.schedule({
      id: targetKey(target),
      label: targetLabel(target),
      errorMessage: 'حذف ناموفق بود',
      commit: async () => {
        const fresh = findFreshTarget(target, dataRef.current.activeItems, dataRef.current.history)

        if (fresh) {
          await deleteVehicleDetailItem({
            spreadsheetId,
            target: fresh,
            deleteLinkedExpense: withLinkedExpense
          })
        }
        await loadDetail()
      }
    })
  }

  /** Rows with a linked expense also offer to delete that expense (on by default, as before). */
  const openDeleteTarget = async (target: VehicleDeleteTarget) => {
    const label = targetLabel(target)
    const confirmed = await confirmDelete({
      label,
      message: undoableDeleteMessage(label),
      checkbox: target.item.expenseRecordId
        ? { label: 'هزینهٔ مرتبط در رکوردها هم حذف شود', defaultChecked: true }
        : undefined
    })

    if (!confirmed) return

    scheduleTargetDelete(target, confirmed.checked)
  }

  const requestDeleteTransaction = async (item: VehicleTransactionItem) => {
    if (!item.expenseRecordId) return

    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    const label = item.title ? `تراکنش «${item.title}»` : 'تراکنش'

    if (!(await confirmDelete({ label, message: undoableDeleteMessage(label) }))) return

    void undoableDelete.schedule({
      id: `transaction:${item.id}`,
      label,
      errorMessage: 'خطا در حذف تراکنش',
      commit: async () => {
        await deleteManualVehicleExpense(spreadsheetId, item.expenseRecordId)
        await loadDetail()
      }
    })
  }

  return {
    visibleActiveItems: pendingId
      ? activeItems.filter(item => activeKey(item) !== pendingId)
      : activeItems,
    visibleHistory: pendingId
      ? history.filter(item => `history:${item.id}` !== pendingId)
      : history,
    visibleTransactions: pendingId
      ? transactions.filter(item => `transaction:${item.id}` !== pendingId)
      : transactions,
    openDeleteTarget,
    requestDeleteTransaction
  }
}
