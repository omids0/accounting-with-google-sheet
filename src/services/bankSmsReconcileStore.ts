import {
  withoutDigestLine,
  type ReconcileDigestGate,
  type ReconcileEntry
} from './bankSmsReconcile'
import { getItem, setItem } from './storage'

/** Per spreadsheet: `{ [accountId]: ReconcileEntry }` — last success and «نادیده». */
export const RECONCILE_STORAGE_KEY = 'accounting_reconcile_v1'

/** Per spreadsheet: today's digest lines (`ReconcileDigestGate`). */
export const RECONCILE_DIGEST_STORAGE_KEY = 'accounting_reconcile_digest_v1'

function readStore<T>(key: string): Record<string, T> {
  return getItem<Record<string, T>>(key) ?? {}
}

function writeStore<T>(key: string, spreadsheetId: string, value: T): void {
  try {
    setItem(key, { ...readStore<T>(key), [spreadsheetId]: value })
  } catch {
    // Private mode: the state is lost on reload; harmless.
  }
}

export function readReconcileEntries(spreadsheetId: string): Record<string, ReconcileEntry> {
  return readStore<Record<string, ReconcileEntry>>(RECONCILE_STORAGE_KEY)[spreadsheetId] ?? {}
}

function writeEntry(spreadsheetId: string, accountId: string, entry: ReconcileEntry): void {
  writeStore(RECONCILE_STORAGE_KEY, spreadsheetId, {
    ...readReconcileEntries(spreadsheetId),
    [accountId]: entry
  })
  dropReconcileDigestLine(spreadsheetId, accountId)
}

/** «نادیده»: hide this exact difference until it changes. */
export function ignoreReconcileDifference(
  spreadsheetId: string,
  accountId: string,
  difference: number
): void {
  writeEntry(spreadsheetId, accountId, {
    ...readReconcileEntries(spreadsheetId)[accountId],
    ignored: difference
  })
}

/** App and bank agree: the next wizard range starts at this SMS. */
export function saveReconcileSuccess(
  spreadsheetId: string,
  accountId: string,
  agreed: { balance: number; smsAt: number },
  now = new Date()
): void {
  writeEntry(spreadsheetId, accountId, { at: now.toISOString(), ...agreed })
}

export function readReconcileDigestGate(spreadsheetId: string): ReconcileDigestGate | undefined {
  return readStore<ReconcileDigestGate>(RECONCILE_DIGEST_STORAGE_KEY)[spreadsheetId]
}

export function writeReconcileDigestGate(spreadsheetId: string, gate: ReconcileDigestGate): void {
  writeStore(RECONCILE_DIGEST_STORAGE_KEY, spreadsheetId, gate)
}

function dropReconcileDigestLine(spreadsheetId: string, accountId: string): void {
  const gate = readReconcileDigestGate(spreadsheetId)
  const next = withoutDigestLine(gate, accountId)

  if (next && next !== gate) writeReconcileDigestGate(spreadsheetId, next)
}
