import type { Mock } from 'vitest'

import { clearStore, getSheetAllRows, getSheetDataRows, setSheetAllRows } from './spreadsheetStore'
import { TRANSFERS_HEADERS, TRANSFERS_SHEET } from './transfersModel'
import { WALLET_HEADERS, WALLET_SHEET } from './wallet'
import { WALLET_LEDGER_HEADERS, WALLET_LEDGER_SHEET, rowToLedgerEntry } from './walletLedger'

/** Shared set-up of the transfer tests: a two-account wallet in the local mirror. */
export const SHEET_ID = 'transfers-test'

export const accountRow = (id: string, balance: number) => [id, 't', `حساب ${id}`, String(balance)]

/** The sheet as other devices left it (by tab); a tab not listed reads from this device's mirror. */
export const remote: Record<string, string[][]> = {}

export const balanceOf = (id: string): number =>
  Number(getSheetDataRows(SHEET_ID, WALLET_SHEET)?.find(row => row[0] === id)?.[3])

export const walletTotal = (): number =>
  (getSheetDataRows(SHEET_ID, WALLET_SHEET) ?? []).reduce((sum, row) => sum + Number(row[3]), 0)

export const ledger = () =>
  (getSheetDataRows(SHEET_ID, WALLET_LEDGER_SHEET) ?? []).map(rowToLedgerEntry)

export const transferRows = () => getSheetDataRows(SHEET_ID, TRANSFERS_SHEET) ?? []

/** The writes of one tab that reached the outbox. */
export const opsOn = (enqueue: Mock, sheetName: string) =>
  enqueue.mock.calls
    .map(
      ([, op]) => op as { type: string; sheetName: string; row: string[]; writeOptions?: object }
    )
    .filter(op => op.sheetName === sheetName)

/** Fresh mirror (a 100M, b 50M) and a Google read that answers from `remote` or the mirror. */
export function resetWallet(fetchRange: Mock): void {
  localStorage.clear()
  clearStore(SHEET_ID)
  for (const key of Object.keys(remote)) delete remote[key]
  fetchRange.mockReset()
  fetchRange.mockImplementation(async (_id: string, tab: string, suffix?: string) => {
    const rows = remote[tab] ?? getSheetAllRows(SHEET_ID, tab) ?? []

    if (suffix === 'A:A') return rows.map(row => [row[0] ?? ''])

    const n = Number(suffix?.split(':')[0])

    return rows[n - 1] ? [rows[n - 1]] : []
  })
  setSheetAllRows(SHEET_ID, WALLET_SHEET, [
    WALLET_HEADERS,
    accountRow('a', 100e6),
    accountRow('b', 50e6)
  ])
  setSheetAllRows(SHEET_ID, WALLET_LEDGER_SHEET, [WALLET_LEDGER_HEADERS])
  setSheetAllRows(SHEET_ID, TRANSFERS_SHEET, [TRANSFERS_HEADERS])
}

export const transferInput = (over: Record<string, unknown> = {}) => ({
  spreadsheetId: SHEET_ID,
  fromAccountId: 'a',
  toAccountId: 'b',
  amount: 30e6,
  date: '2026-07-01',
  note: 'قسط',
  ...over
})
