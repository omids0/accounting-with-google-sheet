import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ConfirmableSms } from './bankSmsQueue'

const mocks = vi.hoisted(() => ({ enqueue: vi.fn() }))

vi.mock('./sheetSync', () => ({ enqueueSheetWrite: mocks.enqueue, queueOutboxWrite: vi.fn() }))
vi.mock('./bankSmsNative', () => ({ markBankSmsHandled: vi.fn() }))
vi.mock('./sheets', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ensureSheetWithHeaders: async () => undefined
}))
vi.mock('./activityLog', () => ({ logActivity: vi.fn(), logItemActivity: vi.fn() }))

const { confirmSmsEntry, confirmSmsTransfer } = await import('./bankSmsApply')
const { TRANSFERS_HEADERS, TRANSFERS_SHEET } = await import('./transfersModel')
const { WALLET_HEADERS, WALLET_SHEET } = await import('./wallet')
const { WALLET_LEDGER_HEADERS, WALLET_LEDGER_SHEET } = await import('./walletLedger')
const { clearStore, setSheetAllRows } = await import('./spreadsheetStore')

const SHEET_ID = 'wallet-sms-absolute'

const sms = (accountId: string, direction: 'debit' | 'credit', balance: number) =>
  ({
    sms: { id: `sms-${accountId}`, receivedAt: Date.now(), body: 'x', sender: 'bank' },
    amount: 4_000_000,
    balance,
    result: { kind: 'matched', accountId, direction, ref: '', templateId: 't', balance }
  } as unknown as ConfirmableSms)

describe('a bank SMS balance stays an absolute write', () => {
  beforeEach(() => {
    localStorage.clear()
    clearStore(SHEET_ID)
    mocks.enqueue.mockClear()
    setSheetAllRows(SHEET_ID, WALLET_SHEET, [
      WALLET_HEADERS,
      ['a', 't', 'a', '100000000'],
      ['b', 't', 'b', '5000000']
    ])
    setSheetAllRows(SHEET_ID, WALLET_LEDGER_SHEET, [WALLET_LEDGER_HEADERS])
    setSheetAllRows(SHEET_ID, TRANSFERS_SHEET, [TRANSFERS_HEADERS])
  })

  const walletOps = () =>
    mocks.enqueue.mock.calls
      .map(
        ([, op]) =>
          op as { sheetName: string; row: string[]; writeOptions?: { mergeBalance?: boolean } }
      )
      .filter(op => op.sheetName === WALLET_SHEET)

  it('sets the balance the SMS reports and is not queued as a change', async () => {
    await confirmSmsEntry(SHEET_ID, sms('a', 'debit', 96_000_000), null)

    expect(walletOps().map(op => op.row[3])).toEqual(['96000000'])
    expect(walletOps().every(op => op.writeOptions === undefined)).toBe(true)
  })

  it('a transfer is not an absolute write: it moves by the amount, whatever the «مانده» says', async () => {
    await confirmSmsTransfer(
      SHEET_ID,
      sms('a', 'debit', 90_000_000),
      sms('b', 'credit', 12_000_000)
    )

    expect(walletOps().map(op => op.row[3])).toEqual(['96000000', '9000000'])
    expect(walletOps().every(op => op.writeOptions?.mergeBalance === true)).toBe(true)
  })
})
