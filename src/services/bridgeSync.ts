import { readBridgePrefs, updateBridgePrefs, type PendingBridgeSync } from './bridgePrefs'
import { bridgeReference } from './bridgeRows'
import { bridgeSyncOperation } from './bridgeSyncRows'
import { expenseRecordInput } from './buildingExpenseActions'
import { RECEIVABLES_SHEET } from './sheetNames'
import { batchFetchSheetRangesFromApi } from './sheetsRows'
import { getOutboxEntries } from './syncOutbox'
import { drainWorkspace, writeToWorkspace } from './workspaceBridge'
import { getTodayIso } from '../utils/jalaliDate'

type Values = Record<string, string | number | undefined>

/** The bridged receivable's own append must have reached the sheet before it can be found. */
export const isReceivableQueued = (personalId: string, recordId: string) =>
  getOutboxEntries(personalId).some(
    entry =>
      entry.operation.type === 'append' &&
      entry.operation.sheetName === RECEIVABLES_SHEET &&
      entry.operation.row[11] === bridgeReference(recordId)
  )

/** Reads the personal sheet directly and queues the write. True: done, drop the task. */
async function applySync(task: PendingBridgeSync): Promise<boolean> {
  if (isReceivableQueued(task.personalId, task.recordId)) {
    await drainWorkspace(task.personalId)
    if (isReceivableQueued(task.personalId, task.recordId)) return false
  }

  const tabs = await batchFetchSheetRangesFromApi(task.personalId, [RECEIVABLES_SHEET])

  const operation = bridgeSyncOperation({
    kind: task.kind,
    recordId: task.recordId,
    title: task.title,
    amount: task.amount,
    date: task.date,
    receivableRows: tabs.get(RECEIVABLES_SHEET) ?? []
  })

  // The receivable was deleted, or already says the same: nothing to write.
  if (operation) await writeToWorkspace(task.personalId, operation)

  return true
}

let running: Promise<void> | null = null

/** Writes the waiting edits and deletes of bridged receivables (one run at a time per device). */
export function runBridgeSyncs(): Promise<void> {
  running ??= (async () => {
    const tried = new Set<string>()

    // Read again after every task: one queued while this run works is picked up by it too.
    for (;;) {
      const task = readBridgePrefs().syncs.find(item => !tried.has(item.id))

      if (!task || (typeof navigator !== 'undefined' && !navigator.onLine)) return
      tried.add(task.id)

      const done = await applySync(task).catch(() => false)

      if (done) {
        // A newer task for the same expense has another id and stays.
        updateBridgePrefs({ syncs: readBridgePrefs().syncs.filter(item => item.id !== task.id) })
      }
    }
  })().finally(() => {
    running = null
  })

  return running
}

/** Persists the task first (an offline moment never loses it), then tries to send it. */
function enqueue(task: Omit<PendingBridgeSync, 'id'>): Promise<void> {
  const prefs = readBridgePrefs()

  updateBridgePrefs({
    syncs: [
      ...prefs.syncs.filter(item => item.recordId !== task.recordId),
      { id: crypto.randomUUID(), ...task }
    ]
  })

  return runBridgeSyncs()
}

/**
 * A building expense with a bridged personal receivable was edited: its title, amount and date are
 * written to the receivable too (never below what was paid on it). Does nothing for an expense
 * that was never bridged. Never undoes the edit: a failure leaves the write queued.
 */
export async function syncBridgedExpenseEdit(
  recordId: string,
  values: Values,
  dateFieldId = 'date'
): Promise<void> {
  const personalId = readBridgePrefs().sent[recordId]

  if (!personalId) return

  const record = expenseRecordInput(recordId, values, dateFieldId)

  if (!(record.amount > 0)) return
  await enqueue({
    personalId,
    recordId,
    kind: 'edit',
    title: record.title,
    amount: record.amount,
    date: record.date || getTodayIso()
  })
}

/**
 * The building expense was deleted: its bridged receivable is deleted too when nothing was paid on
 * it, otherwise kept and marked. The expense is forgotten either way (no repayment can reach it).
 */
export async function syncBridgedExpenseDelete(recordId: string): Promise<void> {
  const prefs = readBridgePrefs()

  const personalId = prefs.sent[recordId]

  if (!personalId) return

  const sent = { ...prefs.sent }

  delete sent[recordId]
  updateBridgePrefs({ sent })
  await enqueue({ personalId, recordId, kind: 'delete', title: '', amount: 0, date: '' })
}
