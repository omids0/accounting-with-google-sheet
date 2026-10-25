import { getItem, setItem } from './storage'

/** Per spreadsheet: the ids of the suspects the user confirmed as fine («تأیید کردم»). */
export const WALLET_TRACE_STORAGE_KEY = 'accounting_wallet_trace_v1'

export function readTraceAcks(spreadsheetId: string): Set<string> {
  const store = getItem<Record<string, string[]>>(WALLET_TRACE_STORAGE_KEY) ?? {}
  const ids = store[spreadsheetId]

  return new Set(Array.isArray(ids) ? ids.map(String) : [])
}

export function writeTraceAcks(spreadsheetId: string, acked: Set<string>): void {
  try {
    const store = getItem<Record<string, string[]>>(WALLET_TRACE_STORAGE_KEY) ?? {}

    setItem(WALLET_TRACE_STORAGE_KEY, { ...store, [spreadsheetId]: [...acked] })
  } catch {
    // Private mode: the confirmation only lasts for this visit; harmless.
  }
}
