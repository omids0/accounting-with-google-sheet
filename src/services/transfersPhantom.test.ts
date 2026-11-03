import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as SheetsRowsModule from './sheetsRows'
import {
  SHEET_ID,
  accountRow,
  balanceOf,
  ledger,
  opsOn,
  resetWallet,
  transferRows
} from './transfersTestKit'

const mocks = vi.hoisted(() => ({ fetchRange: vi.fn(), enqueue: vi.fn(), activity: vi.fn() }))

vi.mock('./sheetsRows', async importOriginal => ({
  ...(await importOriginal<typeof SheetsRowsModule>()),
  fetchSheetRangeFromApi: mocks.fetchRange
}))
vi.mock('./sheetSync', () => ({ enqueueSheetWrite: mocks.enqueue, queueOutboxWrite: vi.fn() }))
vi.mock('./activityLog', () => ({ logActivity: mocks.activity, logItemActivity: vi.fn() }))
vi.mock('./sheets', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ensureSheetWithHeaders: vi.fn().mockResolvedValue(undefined)
}))

const { deleteTransfer, transferLegState, transferLegInfo } = await import('./transfers')
const { TRANSFERS_HEADERS, TRANSFERS_SHEET, transferToRow } = await import('./transfersModel')
const { WALLET_HEADERS, WALLET_SHEET } = await import('./wallet')
const { WALLET_LEDGER_HEADERS, WALLET_LEDGER_SHEET, ledgerEntry, ledgerRow } = await import(
  './walletLedger'
)
const { setSheetAllRows } = await import('./spreadsheetStore')

const transfer = {
  id: 'phantom-1',
  createdAt: '',
  date: '2026-07-01',
  fromAccountId: 'a',
  toAccountId: 'b',
  amount: 30e6,
  note: '',
  createdBy: ''
}

type Leg = [accountId: string, delta: number, title?: string]

/** A transfer row plus the given history rows (what survived of its save), balances as given. */
function seed(legs: Leg[], balances: [number, number] = [100e6, 50e6]): void {
  setSheetAllRows(SHEET_ID, WALLET_SHEET, [
    WALLET_HEADERS,
    accountRow('a', balances[0]),
    accountRow('b', balances[1])
  ])
  setSheetAllRows(SHEET_ID, TRANSFERS_SHEET, [TRANSFERS_HEADERS, transferToRow(transfer)])
  setSheetAllRows(SHEET_ID, WALLET_LEDGER_SHEET, [
    WALLET_LEDGER_HEADERS,
    ...legs.map(([accountId, delta, title]) =>
      ledgerRow(
        ledgerEntry(accountId, delta, 0, {
          title: title ?? 'انتقال',
          date: transfer.date,
          source: 'transfer',
          recordId: transfer.id
        })
      )
    )
  ])
}

const walletWrites = () => opsOn(mocks.enqueue, WALLET_SHEET)

beforeEach(() => {
  resetWallet(mocks.fetchRange)
  mocks.enqueue.mockReset()
  mocks.activity.mockReset()
})

describe('deleteTransfer of a transfer whose save was cut off', () => {
  it('only removes the row of a phantom (no history rows): no money moved, none comes back', async () => {
    seed([])

    await deleteTransfer(SHEET_ID, transfer.id)

    expect(transferRows()).toEqual([])
    expect(walletWrites()).toEqual([])
    expect(balanceOf('a')).toBe(100e6)
    expect(balanceOf('b')).toBe(50e6)
    expect(ledger()).toEqual([])
    expect(mocks.activity).toHaveBeenCalledWith(
      SHEET_ID,
      expect.objectContaining({ action: 'delete', itemId: transfer.id })
    )
  })

  it('gives back only the side that moved when one history row exists', async () => {
    seed([['a', -30e6]], [70e6, 50e6])

    await deleteTransfer(SHEET_ID, transfer.id)

    expect(transferRows()).toEqual([])
    expect(balanceOf('a')).toBe(100e6)
    expect(balanceOf('b')).toBe(50e6)
    expect(walletWrites()).toHaveLength(1)
    expect(ledger().slice(1)).toEqual([
      expect.objectContaining({
        accountId: 'a',
        delta: 30e6,
        source: 'transfer',
        recordId: transfer.id,
        title: 'لغو انتقال به «حساب b»'
      })
    ])
  })

  it('gives back the destination side alone when only it moved', async () => {
    seed([['b', 30e6]], [100e6, 80e6])

    await deleteTransfer(SHEET_ID, transfer.id)

    expect(balanceOf('a')).toBe(100e6)
    expect(balanceOf('b')).toBe(50e6)
    expect(ledger().slice(1)).toEqual([
      expect.objectContaining({ accountId: 'b', delta: -30e6, title: 'لغو انتقال از «حساب a»' })
    ])
  })

  it('reverses both sides of a complete transfer', async () => {
    seed(
      [
        ['a', -30e6],
        ['b', 30e6]
      ],
      [70e6, 80e6]
    )

    await deleteTransfer(SHEET_ID, transfer.id)

    expect(balanceOf('a')).toBe(100e6)
    expect(balanceOf('b')).toBe(50e6)
    expect(ledger()).toHaveLength(4)
  })

  it('reverses the net, so a reversal already made is not made twice', async () => {
    // The moves, then their «لغو» rows, and the transfer row is still there (an old failed delete).
    seed([
      ['a', -30e6],
      ['b', 30e6],
      ['a', 30e6, 'لغو انتقال به «حساب b»'],
      ['b', -30e6, 'لغو انتقال از «حساب a»']
    ])

    await deleteTransfer(SHEET_ID, transfer.id)

    expect(transferRows()).toEqual([])
    expect(walletWrites()).toEqual([])
    expect(balanceOf('a')).toBe(100e6)
    expect(balanceOf('b')).toBe(50e6)
    expect(ledger()).toHaveLength(4)
  })

  it('reverses only what is left when one side was already reversed', async () => {
    seed(
      [
        ['a', -30e6],
        ['b', 30e6],
        ['a', 30e6, 'لغو انتقال به «حساب b»']
      ],
      [100e6, 80e6]
    )

    await deleteTransfer(SHEET_ID, transfer.id)

    expect(balanceOf('a')).toBe(100e6)
    expect(balanceOf('b')).toBe(50e6)
    expect(walletWrites()).toHaveLength(1)
  })

  it('only removes the row of a complete transfer when one of its accounts was deleted', async () => {
    seed([
      ['a', -30e6],
      ['b', 30e6]
    ])
    setSheetAllRows(SHEET_ID, WALLET_SHEET, [WALLET_HEADERS, accountRow('a', 70e6)])

    await deleteTransfer(SHEET_ID, transfer.id)

    expect(transferRows()).toEqual([])
    expect(walletWrites()).toEqual([])
    expect(balanceOf('a')).toBe(70e6)
  })

  it('still gives back a live account when the deleted one never had a move', async () => {
    seed([['a', -30e6]], [70e6, 50e6])
    setSheetAllRows(SHEET_ID, WALLET_SHEET, [WALLET_HEADERS, accountRow('a', 70e6)])

    await deleteTransfer(SHEET_ID, transfer.id)

    expect(balanceOf('a')).toBe(100e6)
    expect(ledger().slice(1)).toEqual([
      expect.objectContaining({
        accountId: 'a',
        delta: 30e6,
        title: 'لغو انتقال به «حساب حذف‌شده»'
      })
    ])
  })
})

describe('transferLegState', () => {
  const entry = (accountId: string, delta: number, applied = true) => ({
    ...ledgerEntry(accountId, delta, 0, {
      title: 't',
      date: transfer.date,
      source: 'transfer',
      recordId: transfer.id
    }),
    applied
  })

  it('counts the accounts whose balance the transfer still moves', () => {
    expect(transferLegState(transfer, [])).toBe(0)
    expect(transferLegState(transfer, [entry('a', -30e6)])).toBe(1)
    expect(transferLegState(transfer, [entry('a', -30e6), entry('b', 30e6)])).toBe(2)
  })

  it('does not count a move that was taken back, nor another transfer, nor another source', () => {
    const other = { ...entry('b', 30e6), recordId: 'other' }
    const manual = { ...entry('b', 30e6), source: 'ثبت' as const }

    expect(transferLegState(transfer, [entry('a', -30e6), entry('a', 30e6), other, manual])).toBe(0)
  })

  it('takes a «بدون اثر» move as done but not as something to give back', () => {
    const legs = [entry('a', -30e6), entry('b', 30e6, false)]

    expect(transferLegState(transfer, legs)).toBe(2)
    expect(transferLegInfo(transfer, legs).movedAccountIds).toEqual(['a'])
  })
})
