import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as SheetsRowsModule from './sheetsRows'

const mocks = vi.hoisted(() => ({ fetchRange: vi.fn(), enqueue: vi.fn() }))

vi.mock('./sheetsRows', async importOriginal => ({
  ...(await importOriginal<typeof SheetsRowsModule>()),
  fetchSheetRangeFromApi: mocks.fetchRange
}))
vi.mock('./sheetSync', () => ({ enqueueSheetWrite: mocks.enqueue, queueOutboxWrite: vi.fn() }))
vi.mock('./paymentTransactions', () => ({
  createLinkedExpenseRecord: async () => 'rec-expense',
  createLinkedIncomeRecord: async () => 'rec-income'
}))
vi.mock('./activityLog', () => ({ logActivity: vi.fn(), logItemActivity: vi.fn() }))

const { applyWalletChanges, recordLedgerContext } = await import('./recordWallet')
const { createReconcileCorrection } = await import('./bankSmsReconcileApply')
const { WALLET_HEADERS, WALLET_SHEET, fetchWalletAccounts } = await import('./wallet')
const { WALLET_LEDGER_HEADERS, WALLET_LEDGER_SHEET } = await import('./walletLedger')
const { clearStore, setSheetAllRows } = await import('./spreadsheetStore')

const SHEET_ID = 'wallet-fresh-delta'

const accountRow = (id: string, balance: number) => [id, 't', id, String(balance)]

const context = recordLedgerContext({ title: 'x', date: '1405-07-19' }, 'ثبت', 'r1')

/** The sheet as other devices left it; this device's mirror stays on the old copy. */
let remote: string[][] = []

const writes = () =>
  mocks.enqueue.mock.calls.map(
    ([, op]) =>
      op as { sheetName: string; row: string[]; writeOptions?: { mergeBalance?: boolean } }
  )

const walletWrites = () => writes().filter(op => op.sheetName === WALLET_SHEET)

describe('a balance change is applied to the balance the sheet holds now', () => {
  beforeEach(() => {
    localStorage.clear()
    clearStore(SHEET_ID)
    mocks.enqueue.mockClear()
    mocks.fetchRange.mockReset()
    mocks.fetchRange.mockImplementation(async (_id: string, tab: string, suffix?: string) => {
      if (tab !== WALLET_SHEET) return []
      if (suffix === 'A:A') return remote.map(row => [row[0] ?? ''])

      const n = Number(suffix?.split(':')[0])

      return remote[n - 1] ? [remote[n - 1]] : []
    })
    // Device A already spent 6M of the 100M; this device (B) still shows 100M.
    remote = [WALLET_HEADERS, accountRow('a', 94e6), accountRow('b', 5e6)]
    setSheetAllRows(SHEET_ID, WALLET_SHEET, [
      WALLET_HEADERS,
      accountRow('a', 100e6),
      accountRow('b', 5e6)
    ])
    setSheetAllRows(SHEET_ID, WALLET_LEDGER_SHEET, [WALLET_LEDGER_HEADERS])
  })

  it('A paid 6M, stale B pays 4M: the account shows 90M and the write is a change', async () => {
    await applyWalletChanges(SHEET_ID, null, { accountId: 'a', delta: -4e6 }, context)

    const [write] = walletWrites()

    expect(write.row[3]).toBe('90000000')
    expect(write.writeOptions).toEqual({ mergeBalance: true })
    expect((await fetchWalletAccounts(SHEET_ID)).find(item => item.id === 'a')?.balance).toBe(90e6)
  })

  it('a transfer between two accounts reads and moves both', async () => {
    remote[2] = accountRow('b', 7e6)
    await applyWalletChanges(SHEET_ID, null, { accountId: 'b', delta: 1e6 }, context)
    await applyWalletChanges(SHEET_ID, null, { accountId: 'a', delta: -1e6 }, context)

    const [toB, fromA] = walletWrites()

    expect(toB.row[3]).toBe('8000000')
    expect(fromA.row[3]).toBe('93000000')
  })

  it('reverses only its own amount when a record is deleted from a stale device', async () => {
    await applyWalletChanges(SHEET_ID, { accountId: 'a', delta: -4e6 }, null, context)

    expect(walletWrites()[0].row[3]).toBe('98000000')
  })

  it('works from the local copy when the sheet cannot be read (offline use)', async () => {
    mocks.fetchRange.mockRejectedValue(new Error('offline'))
    await applyWalletChanges(SHEET_ID, null, { accountId: 'a', delta: -4e6 }, context)

    const [write] = walletWrites()

    // 100M - 4M here; the queued change is merged with the sheet's 94M when it is sent.
    expect(write.row[3]).toBe('96000000')
    expect(write.writeOptions).toEqual({ mergeBalance: true })
  })

  it('writes no balance for an account another device deleted, and does not fail', async () => {
    remote = [WALLET_HEADERS, accountRow('b', 5e6)]
    await applyWalletChanges(SHEET_ID, null, { accountId: 'a', delta: -4e6 }, context)

    expect(walletWrites()).toHaveLength(0)
  })

  it('skips the read while a write to the wallet tab is still queued', async () => {
    const { addOutboxEntry } = await import('./syncOutbox')

    addOutboxEntry(SHEET_ID, { type: 'update', sheetName: WALLET_SHEET, rowNumber: 3, row: [] })
    await applyWalletChanges(SHEET_ID, null, { accountId: 'a', delta: -4e6 }, context)

    expect(mocks.fetchRange).not.toHaveBeenCalled()
    expect(walletWrites()[0].row[3]).toBe('96000000')
  })

  it('«تطبیق» moves the account by its difference, on the sheet balance', async () => {
    await createReconcileCorrection(SHEET_ID, 'a', {
      difference: 1e6,
      smsAt: Date.now(),
      smsBalance: 93e6
    })

    expect(walletWrites()[0].row[3]).toBe('93000000')
  })
})
