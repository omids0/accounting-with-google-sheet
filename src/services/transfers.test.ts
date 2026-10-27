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

const { createTransfer, fetchTransfers } = await import('./transfers')
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

describe('createTransfer', () => {
  it('moves the amount from one balance to the other and keeps the wallet total', async () => {
    const before = walletTotal()
    const transfer = await createTransfer(input())

    expect(balanceOf('a')).toBe(70e6)
    expect(balanceOf('b')).toBe(80e6)
    expect(walletTotal()).toBe(before)
    expect(transfer).toMatchObject({
      fromAccountId: 'a',
      toAccountId: 'b',
      amount: 30e6,
      date: '2026-07-01',
      note: 'قسط'
    })
  })

  it('appends one transfer row with account ids', async () => {
    const transfer = await createTransfer(input())

    expect(transferRows()).toEqual([
      [transfer.id, transfer.createdAt, '2026-07-01', 'a', 'b', '30000000', 'قسط', '']
    ])
    expect(mocks.ensure).toHaveBeenCalledWith(SHEET_ID, TRANSFERS_SHEET, TRANSFERS_HEADERS)
  })

  it('writes one history row per account, linked to the transfer', async () => {
    const transfer = await createTransfer(input())
    const [out, into] = ledger()

    expect(out).toMatchObject({
      accountId: 'a',
      delta: -30e6,
      balanceAfter: 70e6,
      source: 'transfer',
      recordId: transfer.id,
      title: 'انتقال به «حساب b»',
      date: '2026-07-01'
    })
    expect(into).toMatchObject({
      accountId: 'b',
      delta: 30e6,
      balanceAfter: 80e6,
      source: 'transfer',
      recordId: transfer.id,
      title: 'انتقال از «حساب a»'
    })
  })

  it('sends both balances as changes another device survives', async () => {
    await createTransfer(input())

    expect(ops(WALLET_SHEET).map(op => op.writeOptions)).toEqual([
      { mergeBalance: true },
      { mergeBalance: true }
    ])
  })

  it('logs the activity in Persian', async () => {
    const transfer = await createTransfer(input())

    expect(mocks.activity).toHaveBeenCalledWith(
      SHEET_ID,
      expect.objectContaining({
        action: 'create',
        module: 'wallet',
        itemId: transfer.id,
        summary: expect.stringMatching(/^انتقال .+ از «حساب a» به «حساب b» را ثبت کرد$/)
      })
    )
  })

  it('rejects the same account on both sides', async () => {
    await expect(createTransfer(input({ toAccountId: 'a' }))).rejects.toThrow(
      'حساب مبدأ و حساب مقصد نباید یکی باشند'
    )
    expect(mocks.enqueue).not.toHaveBeenCalled()
  })

  it.each([
    [0, 'مبلغ باید بیشتر از صفر باشد'],
    [-5, 'مبلغ باید بیشتر از صفر باشد'],
    [Number.NaN, 'مبلغ واردشده عدد معتبری نیست']
  ])('rejects the amount %s', async (amount, message) => {
    await expect(createTransfer(input({ amount }))).rejects.toThrow(message)
    expect(mocks.enqueue).not.toHaveBeenCalled()
  })

  it('rejects an account that is not there', async () => {
    await expect(createTransfer(input({ toAccountId: 'zzz' }))).rejects.toThrow('حساب پیدا نشد')
    expect(transferRows()).toEqual([])
  })

  it('rejects an account another device deleted', async () => {
    remote[WALLET_SHEET] = [WALLET_HEADERS, accountRow('a', 100e6)]

    await expect(createTransfer(input())).rejects.toThrow('حساب پیدا نشد')
    expect(transferRows()).toEqual([])
    expect(ledger()).toEqual([])
  })

  it('allows the source balance to go negative', async () => {
    await createTransfer(input({ amount: 130e6 }))

    expect(balanceOf('a')).toBe(-30e6)
    expect(balanceOf('b')).toBe(180e6)
  })

  it('works on the balance the sheet holds now, not this device’s old copy', async () => {
    // Device B already spent 5M of a; this device still shows 100M.
    remote[WALLET_SHEET] = [WALLET_HEADERS, accountRow('a', 95e6), accountRow('b', 50e6)]

    await createTransfer(input({ amount: 3e6 }))

    const [first] = ops(WALLET_SHEET)

    expect(first.row[3]).toBe('92000000')
    expect(first.writeOptions).toEqual({ mergeBalance: true })
    expect(ledger()[0]).toMatchObject({ delta: -3e6, balanceAfter: 92e6 })
  })

  it('is refused outside the personal books, before anything is written', async () => {
    setWorkspaceType(SHEET_ID, 'building')

    await expect(createTransfer(input())).rejects.toThrow('فقط در دفتر شخصی')
    expect(mocks.enqueue).not.toHaveBeenCalled()
  })
})

describe('fetchTransfers', () => {
  it('lists the newest first, by date and then by registration', async () => {
    const row = (id: string, date: string, createdAt: string) => [
      id,
      createdAt,
      date,
      'a',
      'b',
      '5',
      '',
      ''
    ]

    setSheetAllRows(SHEET_ID, TRANSFERS_SHEET, [
      TRANSFERS_HEADERS,
      row('old', '2026-06-01', '2026-06-01T10:00:00.000Z'),
      row('new', '2026-07-01', '2026-07-01T10:00:00.000Z'),
      row('same-day-later', '2026-07-01', '2026-07-01T12:00:00.000Z'),
      ['', '', '', '', '', '', '', ''],
      ['broken', '', '2026-07-02', '', 'b', '5', '', '']
    ])

    expect((await fetchTransfers(SHEET_ID)).map(item => item.id)).toEqual([
      'same-day-later',
      'new',
      'old'
    ])
  })

  it('is empty, and creates nothing, in a building or a shared account', async () => {
    setWorkspaceType(SHEET_ID, 'building')

    expect(await fetchTransfers(SHEET_ID)).toEqual([])
    expect(mocks.ensure).not.toHaveBeenCalled()
  })
})
