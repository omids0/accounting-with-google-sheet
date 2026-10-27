import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as SheetsRowsModule from './sheetsRows'
import {
  SHEET_ID,
  accountRow,
  balanceOf,
  ledger,
  opsOn,
  remote,
  resetWallet,
  transferInput as input,
  transferRows,
  walletTotal
} from './transfersTestKit'
import type * as WalletLedgerModule from './walletLedger'

const mocks = vi.hoisted(() => ({
  fetchRange: vi.fn(),
  enqueue: vi.fn(),
  activity: vi.fn(),
  ensure: vi.fn(),
  failLedgerOn: 0,
  ledgerCalls: 0
}))

vi.mock('./sheetsRows', async importOriginal => ({
  ...(await importOriginal<typeof SheetsRowsModule>()),
  fetchSheetRangeFromApi: mocks.fetchRange
}))
vi.mock('./sheetSync', () => ({ enqueueSheetWrite: mocks.enqueue, queueOutboxWrite: vi.fn() }))
vi.mock('./activityLog', () => ({ logActivity: mocks.activity, logItemActivity: vi.fn() }))
vi.mock('./sheets', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ensureSheetWithHeaders: mocks.ensure
}))
vi.mock('./walletLedger', async importOriginal => {
  const original = await importOriginal<typeof WalletLedgerModule>()

  return {
    ...original,
    // The Nth append of the test fails (0 = never): a lost history row.
    appendLedgerEntries: async (...args: Parameters<typeof original.appendLedgerEntries>) => {
      mocks.ledgerCalls += 1
      if (mocks.failLedgerOn && mocks.ledgerCalls === mocks.failLedgerOn) {
        throw new Error('ledger write lost')
      }

      return original.appendLedgerEntries(...args)
    }
  }
})

const { createTransfer, deleteTransfer, TransferWriteError } = await import('./transfers')
const { TRANSFERS_HEADERS, TRANSFERS_SHEET } = await import('./transfersModel')
const { WALLET_HEADERS, WALLET_SHEET } = await import('./wallet')
const { setSheetAllRows } = await import('./spreadsheetStore')
const { setWorkspaceType } = await import('./workspace')

const ops = (sheetName: string) => opsOn(mocks.enqueue, sheetName)

beforeEach(() => {
  resetWallet(mocks.fetchRange)
  mocks.enqueue.mockReset()
  mocks.activity.mockReset()
  mocks.ensure.mockReset().mockResolvedValue(undefined)
  mocks.failLedgerOn = 0
  mocks.ledgerCalls = 0
})

describe('when a write fails half-way', () => {
  it('takes the first move back and removes the row when the second history row is lost', async () => {
    mocks.failLedgerOn = 2

    const failure = await createTransfer(input()).catch(error => error)

    expect(failure).toBeInstanceOf(TransferWriteError)
    expect(failure.rolledBack).toBe(true)
    expect(failure.message).toBe('انتقال ثبت نشد و تغییرها برگردانده شد. دوباره تلاش کنید.')
    expect(balanceOf('a')).toBe(100e6)
    expect(balanceOf('b')).toBe(50e6)
    expect(transferRows()).toEqual([])
    // a: the move and its take-back; b: the balance was undone without a history row.
    expect(ledger().map(entry => [entry.accountId, entry.delta])).toEqual([
      ['a', -30e6],
      ['a', 30e6]
    ])
    expect(mocks.activity).not.toHaveBeenCalled()
  })

  it('takes the first move back when the second balance write fails', async () => {
    let walletWrites = 0

    mocks.enqueue.mockImplementation((_id: string, op: { sheetName: string }) => {
      if (op.sheetName !== WALLET_SHEET) return
      walletWrites += 1
      if (walletWrites === 2) throw new Error('storage full')
    })

    const failure = await createTransfer(input()).catch(error => error)

    expect(failure).toBeInstanceOf(TransferWriteError)
    expect(failure.rolledBack).toBe(true)
    expect(balanceOf('a')).toBe(100e6)
    expect(transferRows()).toEqual([])
    expect(ledger().map(entry => entry.delta)).toEqual([-30e6, 30e6])
  })

  it('says so when the take-back fails too', async () => {
    let walletWrites = 0

    mocks.enqueue.mockImplementation((_id: string, op: { sheetName: string }) => {
      if (op.sheetName !== WALLET_SHEET) return
      walletWrites += 1
      if (walletWrites >= 2) throw new Error('storage full')
    })

    const failure = await createTransfer(input()).catch(error => error)

    expect(failure).toBeInstanceOf(TransferWriteError)
    expect(failure.rolledBack).toBe(false)
    expect(failure.message).toContain('نیمه‌کاره ماند')
    // The row never outlives a move that did not finish.
    expect(transferRows()).toEqual([])
  })

  it('hands an expired sign-in to the caller untouched', async () => {
    mocks.enqueue.mockImplementation((_id: string, op: { sheetName: string; row: string[] }) => {
      if (op.sheetName === WALLET_SHEET && op.row[0] === 'b') {
        throw new Error('Request had invalid authentication credentials')
      }
    })

    await expect(createTransfer(input())).rejects.toThrow('invalid authentication credentials')
    expect(balanceOf('a')).toBe(100e6)
  })
})

describe('deleteTransfer', () => {
  it('puts both balances back, logs the reversal and removes the row', async () => {
    const before = walletTotal()
    const { id } = await createTransfer(input())

    await deleteTransfer(SHEET_ID, id)

    expect(balanceOf('a')).toBe(100e6)
    expect(balanceOf('b')).toBe(50e6)
    expect(walletTotal()).toBe(before)
    expect(transferRows()).toEqual([])

    const history = ledger()

    expect(history).toHaveLength(4)
    expect(history.slice(2)).toEqual([
      expect.objectContaining({
        accountId: 'a',
        delta: 30e6,
        balanceAfter: 100e6,
        source: 'transfer',
        recordId: id,
        title: 'لغو انتقال به «حساب b»'
      }),
      expect.objectContaining({
        accountId: 'b',
        delta: -30e6,
        balanceAfter: 50e6,
        source: 'transfer',
        recordId: id,
        title: 'لغو انتقال از «حساب a»'
      })
    ])
    expect(mocks.activity).toHaveBeenLastCalledWith(
      SHEET_ID,
      expect.objectContaining({
        action: 'delete',
        module: 'wallet',
        itemId: id,
        summary: expect.stringMatching(/^انتقال .+ از «حساب a» به «حساب b» را حذف کرد$/)
      })
    )
  })

  it('does nothing the second time', async () => {
    const { id } = await createTransfer(input())

    await deleteTransfer(SHEET_ID, id)
    mocks.enqueue.mockClear()
    await deleteTransfer(SHEET_ID, id)

    expect(mocks.enqueue).not.toHaveBeenCalled()
    expect(balanceOf('a')).toBe(100e6)
    expect(ledger()).toHaveLength(4)
  })

  it('does not reverse a transfer another device already deleted', async () => {
    const { id } = await createTransfer(input())

    remote[TRANSFERS_SHEET] = [TRANSFERS_HEADERS]
    mocks.enqueue.mockClear()
    await deleteTransfer(SHEET_ID, id)

    expect(mocks.enqueue).not.toHaveBeenCalled()
    expect(balanceOf('a')).toBe(70e6)
  })

  it('reverses on the balance the sheet holds now', async () => {
    const { id } = await createTransfer(input())

    // Device B spent 10M from b meanwhile.
    remote[WALLET_SHEET] = [WALLET_HEADERS, accountRow('a', 70e6), accountRow('b', 70e6)]
    remote[TRANSFERS_SHEET] = [TRANSFERS_HEADERS, transferRows()[0]]
    mocks.enqueue.mockClear()
    await deleteTransfer(SHEET_ID, id)

    const [first, second] = ops(WALLET_SHEET)

    expect(first.row[3]).toBe('100000000')
    expect(second.row[3]).toBe('40000000')
    expect(second.writeOptions).toEqual({ mergeBalance: true })
  })

  it('puts the row back when a reversal failed and was taken back', async () => {
    const { id } = await createTransfer(input())

    mocks.failLedgerOn = mocks.ledgerCalls + 2

    const failure = await deleteTransfer(SHEET_ID, id).catch(error => error)

    expect(failure).toBeInstanceOf(TransferWriteError)
    expect(failure.rolledBack).toBe(true)
    expect(transferRows().map(row => row[0])).toEqual([id])
    expect(balanceOf('a')).toBe(70e6)
    expect(balanceOf('b')).toBe(80e6)
  })

  it('only removes the row when one of the accounts was deleted since', async () => {
    const { id } = await createTransfer(input())

    setSheetAllRows(SHEET_ID, WALLET_SHEET, [WALLET_HEADERS, accountRow('a', 70e6)])
    mocks.enqueue.mockClear()
    await deleteTransfer(SHEET_ID, id)

    expect(transferRows()).toEqual([])
    expect(ops(WALLET_SHEET)).toEqual([])
    expect(balanceOf('a')).toBe(70e6)
    expect(ledger()).toHaveLength(2)
  })

  it('is refused outside the personal books', async () => {
    setWorkspaceType(SHEET_ID, 'shared')

    await expect(deleteTransfer(SHEET_ID, 'x')).rejects.toThrow('فقط در دفتر شخصی')
  })
})
