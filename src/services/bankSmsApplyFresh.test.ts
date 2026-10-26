import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ConfirmableSms } from './bankSmsQueue'
import type * as SheetsRowsModule from './sheetsRows'

const mocks = vi.hoisted(() => ({
  fetchRange: vi.fn(),
  enqueue: vi.fn(),
  handled: vi.fn(),
  create: vi.fn()
}))

vi.mock('./sheetsRows', async importOriginal => ({
  ...(await importOriginal<typeof SheetsRowsModule>()),
  fetchSheetRangeFromApi: mocks.fetchRange
}))
vi.mock('./sheetSync', () => ({ enqueueSheetWrite: mocks.enqueue, queueOutboxWrite: vi.fn() }))
vi.mock('./bankSmsNative', () => ({ markBankSmsHandled: mocks.handled }))
vi.mock('./activityLog', () => ({ logActivity: vi.fn(), logItemActivity: vi.fn() }))
vi.mock('./paymentTransactions', () => ({
  createLinkedExpenseRecord: async () => {
    mocks.create()

    return 'rec-1'
  },
  createLinkedIncomeRecord: async () => 'rec-1'
}))

const { confirmSmsEntry, confirmSmsEntryWithId, confirmSmsTransfer } = await import(
  './bankSmsApply'
)
const { WALLET_HEADERS, WALLET_SHEET } = await import('./wallet')
const { WALLET_LEDGER_HEADERS, WALLET_LEDGER_SHEET } = await import('./walletLedger')
const { clearStore, setSheetAllRows } = await import('./spreadsheetStore')

const SHEET_ID = 'sms-apply-fresh'

const accountRow = (id: string, balance: number) => [id, 't', id, String(balance)]

/** The sheet as other devices left it; this device's mirror stays on the old copy. */
let remote: string[][] = []

const sms = (accountId: string, direction: 'debit' | 'credit', balance: number | null, id = 'm1') =>
  ({
    sms: { id, receivedAt: Date.now(), body: 'x', sender: 'bank' },
    amount: 3e6,
    balance,
    result: { kind: 'matched', accountId, direction, ref: '', templateId: 't', balance }
  } as unknown as ConfirmableSms)

const walletWrites = () =>
  mocks.enqueue.mock.calls
    .map(([, op]) => op as { sheetName: string; row: string[]; writeOptions?: object })
    .filter(op => op.sheetName === WALLET_SHEET)

const record = { title: 'خرید', category: 'خوراک', subCategory: '' }

describe('an SMS without «مانده» is a change on the balance the sheet holds now', () => {
  beforeEach(() => {
    localStorage.clear()
    clearStore(SHEET_ID)
    mocks.enqueue.mockClear()
    mocks.create.mockClear()
    mocks.handled.mockReset().mockResolvedValue(undefined)
    mocks.fetchRange.mockReset()
    mocks.fetchRange.mockImplementation(async (_id: string, tab: string, suffix?: string) => {
      if (tab !== WALLET_SHEET) return []
      if (suffix === 'A:A') return remote.map(row => [row[0] ?? ''])

      const n = Number(suffix?.split(':')[0])

      return remote[n - 1] ? [remote[n - 1]] : []
    })
    // Device B already spent 5M of the 100M; this device (A) still shows 100M.
    remote = [WALLET_HEADERS, accountRow('a', 95e6), accountRow('b', 50e6)]
    setSheetAllRows(SHEET_ID, WALLET_SHEET, [
      WALLET_HEADERS,
      accountRow('a', 100e6),
      accountRow('b', 50e6)
    ])
    setSheetAllRows(SHEET_ID, WALLET_LEDGER_SHEET, [WALLET_LEDGER_HEADERS])
  })

  it('card save: 95M - 3M = 92M, sent as a change', async () => {
    await confirmSmsEntry(SHEET_ID, sms('a', 'debit', null), record)

    const [write] = walletWrites()

    expect(write.row[3]).toBe('92000000')
    expect(write.writeOptions).toEqual({ mergeBalance: true })
  })

  it('«فقط موجودی»: the same', async () => {
    await confirmSmsEntry(SHEET_ID, sms('a', 'debit', null), null)

    expect(walletWrites()[0].row[3]).toBe('92000000')
    expect(walletWrites()[0].writeOptions).toEqual({ mergeBalance: true })
  })

  it('a credit adds to the sheet balance', async () => {
    await confirmSmsEntry(SHEET_ID, sms('a', 'credit', null), null)

    expect(walletWrites()[0].row[3]).toBe('98000000')
  })

  it('linked card save (record, then the debt link, then the balance)', async () => {
    const afterRecord = vi.fn(async () => undefined)
    const id = await confirmSmsEntryWithId(SHEET_ID, sms('a', 'debit', null), record, {
      afterRecord
    })

    expect(id).toBe('rec-1')
    expect(afterRecord).toHaveBeenCalledWith('rec-1')
    expect(walletWrites()[0].row[3]).toBe('92000000')
    expect(walletWrites()[0].writeOptions).toEqual({ mergeBalance: true })
  })

  it('internal transfer: both legs on the sheet balance', async () => {
    remote[2] = accountRow('b', 52e6)
    await confirmSmsTransfer(
      SHEET_ID,
      sms('a', 'debit', null, 'm1'),
      sms('b', 'credit', null, 'm2')
    )

    const [from, to] = walletWrites()

    expect(from.row[3]).toBe('92000000')
    expect(to.row[3]).toBe('55000000')
    expect(from.writeOptions).toEqual({ mergeBalance: true })
    expect(to.writeOptions).toEqual({ mergeBalance: true })
  })

  it('writes nothing for an account another device deleted', async () => {
    remote = [WALLET_HEADERS, accountRow('b', 50e6)]
    await confirmSmsEntry(SHEET_ID, sms('a', 'debit', null), null)

    expect(walletWrites()).toHaveLength(0)
  })

  it('an SMS WITH «مانده» stays an absolute write on the local copy', async () => {
    await confirmSmsEntry(SHEET_ID, sms('a', 'debit', 90e6), record)

    const [write] = walletWrites()

    expect(write.row[3]).toBe('90000000')
    expect(write.writeOptions).toBeUndefined()
    expect(mocks.fetchRange).not.toHaveBeenCalled()
  })

  describe('when the native queue fails right after the record was written', () => {
    it('still applies the balance and the link, then says the SMS stayed queued', async () => {
      mocks.handled.mockRejectedValueOnce(new Error('native'))

      const afterRecord = vi.fn(async () => undefined)

      await expect(
        confirmSmsEntryWithId(SHEET_ID, sms('a', 'debit', null), record, { afterRecord })
      ).rejects.toThrow('پیامک از صف بیرون نرفت')

      expect(mocks.create).toHaveBeenCalledTimes(1)
      expect(afterRecord).toHaveBeenCalledWith('rec-1')
      expect(walletWrites()[0].row[3]).toBe('92000000')
    })

    it('a retry writes no second record and no second balance move', async () => {
      mocks.handled.mockRejectedValueOnce(new Error('native'))
      await expect(
        confirmSmsEntryWithId(SHEET_ID, sms('a', 'debit', null), record)
      ).rejects.toThrow()
      mocks.enqueue.mockClear()

      const id = await confirmSmsEntryWithId(SHEET_ID, sms('a', 'debit', null), record)

      expect(id).toBe('rec-1')
      expect(mocks.create).toHaveBeenCalledTimes(1)
      expect(walletWrites()).toHaveLength(0)
      expect(mocks.handled).toHaveBeenCalledTimes(2)
    })

    it('«فقط موجودی» fails before anything moves, so a retry is safe', async () => {
      mocks.handled.mockRejectedValueOnce(new Error('native'))
      await expect(confirmSmsEntry(SHEET_ID, sms('a', 'debit', null), null)).rejects.toThrow()
      expect(walletWrites()).toHaveLength(0)
    })
  })
})
