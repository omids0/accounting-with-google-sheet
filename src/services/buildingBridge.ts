import { getUserEmail } from './auth'
import { readBridgePrefs, updateBridgePrefs, type PendingBridgePayment } from './bridgePrefs'
import {
  bridgePaymentOperations,
  bridgeReference,
  ownChargeOperation,
  pocketReceivableOperation
} from './bridgeRows'
import { activeBuildingName, personalBridgeId } from './bridgeTarget'
import { expenseRecordInput } from './buildingExpenseActions'
import { MANAGER_PAYER } from './buildingLists'
import { getSettings } from './settings'
import { RECEIVABLES_SHEET, WALLET_SHEET } from './sheetNames'
import { batchFetchSheetRangesFromApi } from './sheetsRows'
import { getOutboxEntries } from './syncOutbox'
import { drainBridgeWorkspaces, drainWorkspace, writeToWorkspace } from './workspaceBridge'
import { PAYER_FIELD_ID, withoutBuildingFields } from '../components/form/buildingFields'
import type { CustomForm, FormType } from '../types'
import { getTodayIso } from '../utils/jalaliDate'

type Values = Record<string, string | number | undefined>

/** The record forms as the manager's personal sheet has them (no building columns). */
function personalForm(type: FormType): CustomForm | undefined {
  return withoutBuildingFields(getSettings()?.forms ?? []).find(form => form.type === type)
}

/**
 * Bridge A: an expense the manager paid from their pocket also becomes a receivable «طلب از
 * <building>» in the personal spreadsheet, when the tick is on. Written once per expense (the
 * record id is remembered), and never blocks or undoes the expense: a failure only leaves the
 * receivable queued in the personal workspace. Returns true when a receivable was queued.
 */
export async function bridgePocketExpense(
  recordId: string,
  values: Values,
  dateFieldId = 'date'
): Promise<boolean> {
  const prefs = readBridgePrefs()

  const personalId = personalBridgeId()

  if (!prefs.pocket || !personalId || prefs.sent[recordId]) return false
  if (String(values[PAYER_FIELD_ID] ?? '').trim() !== MANAGER_PAYER) return false

  const record = expenseRecordInput(recordId, values, dateFieldId)

  if (!(record.amount > 0)) return false

  // The write is persisted in the personal outbox before anything is awaited; mark it sent now.
  const sending = writeToWorkspace(
    personalId,
    pocketReceivableOperation({
      recordId,
      building: activeBuildingName(),
      title: record.title,
      amount: record.amount,
      date: record.date || getTodayIso(),
      email: getUserEmail() ?? ''
    })
  )

  updateBridgePrefs({ sent: { ...prefs.sent, [recordId]: personalId } })
  await sending.catch(() => false)

  return true
}

export interface OwnChargeBridge {
  unitNumber: string
  amount: number
  date: string
}

/**
 * Bridge B: the manager's own unit was paid, so the charge is also an expense «خانه › شارژ» in the
 * personal spreadsheet (same amount and date, no account moved). Never blocks the payment.
 */
export async function bridgeOwnCharge(input: OwnChargeBridge): Promise<boolean> {
  const personalId = personalBridgeId()

  const form = personalForm('expense')

  if (!personalId || !form || !(input.amount > 0)) return false

  await writeToWorkspace(
    personalId,
    ownChargeOperation(form, { ...input, building: activeBuildingName() })
  ).catch(() => false)

  return true
}

/** The bridged receivable's own append must have reached the sheet before a payment can find it. */
const isReceivableQueued = (personalId: string, recordId: string) =>
  getOutboxEntries(personalId).some(
    entry =>
      entry.operation.type === 'append' &&
      entry.operation.sheetName === RECEIVABLES_SHEET &&
      entry.operation.row[11] === bridgeReference(recordId)
  )

/** Reads the personal sheet directly and queues the payment writes. True: done, drop the task. */
async function applyPayment(task: PendingBridgePayment): Promise<boolean> {
  if (isReceivableQueued(task.personalId, task.recordId)) {
    await drainWorkspace(task.personalId)
    if (isReceivableQueued(task.personalId, task.recordId)) return false
  }

  const incomeForm = personalForm('income')

  if (!incomeForm) return true

  const tabs = await batchFetchSheetRangesFromApi(task.personalId, [
    RECEIVABLES_SHEET,
    WALLET_SHEET
  ])

  const operations = bridgePaymentOperations({
    recordId: task.recordId,
    amount: task.amount,
    date: task.date,
    account: task.account,
    receivableRows: tabs.get(RECEIVABLES_SHEET) ?? [],
    walletRows: tabs.get(WALLET_SHEET) ?? [],
    incomeForm
  })

  // The receivable was deleted or is paid already: nothing to write.
  if (operations) await writeToWorkspace(task.personalId, operations)

  return true
}

let running: Promise<void> | null = null

/** Writes the payments of settled debts that are still waiting (one run at a time per device). */
export function runBridgePayments(): Promise<void> {
  running ??= (async () => {
    for (const task of readBridgePrefs().payments) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return

      const done = await applyPayment(task).catch(() => false)

      if (done) {
        updateBridgePrefs({
          payments: readBridgePrefs().payments.filter(item => item.id !== task.id)
        })
      }
    }
  })().finally(() => {
    running = null
  })

  return running
}

export interface BridgeSettlement {
  amount: number
  date: string
  /** Personal wallet account that receives the money ('' = none). */
  account: string
}

/**
 * The building's debt to the manager was repaid: the bridged personal receivable gets its payment
 * too. The task is persisted first and retried until the personal sheet can be read, so going
 * offline never loses it; the repayment in the building is never undone by a failure here.
 */
export async function settleBridgedReceivable(
  recordId: string,
  settlement: BridgeSettlement
): Promise<void> {
  const prefs = readBridgePrefs()

  const personalId = prefs.sent[recordId]

  if (!personalId) return

  updateBridgePrefs({
    account: settlement.account,
    payments: [...prefs.payments, { id: crypto.randomUUID(), personalId, recordId, ...settlement }]
  })
  await runBridgePayments()
}

/** Accounts of the personal spreadsheet for the settle sheet's «به حساب شخصی»; read directly. */
export async function loadPersonalAccounts(): Promise<{ id: string; title: string }[]> {
  const personalId = personalBridgeId()

  if (!personalId) return []

  const rows = (await batchFetchSheetRangesFromApi(personalId, [WALLET_SHEET])).get(WALLET_SHEET)

  return (rows ?? [])
    .slice(1)
    .filter(row => String(row[0] ?? '').trim())
    .map(row => ({ id: row[0], title: row[2] ?? '' }))
}

/** Everything the bridges left behind: queued writes of closed workspaces, then waiting payments. */
export async function drainAllBridges(): Promise<void> {
  await drainBridgeWorkspaces()
  await runBridgePayments()
}
