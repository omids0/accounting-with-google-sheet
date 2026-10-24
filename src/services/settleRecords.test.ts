import { beforeEach, describe, expect, it, vi } from 'vitest'

import { settleEntryWallet } from './entryWallet'
import {
  createLinkedExpenseRecord,
  createLinkedIncomeRecord,
  deleteLinkedRecord
} from './paymentTransactions'
import type { SettleOptions } from './settleOptions'
import {
  createLinkedRecordWithWallet,
  deleteLinkedRecordWithWallet,
  isLinkedForeignRecord
} from './settleRecords'
import { fetchRecords } from './sheets'

vi.mock('./entryWallet', () => ({ settleEntryWallet: vi.fn() }))

vi.mock('./paymentTransactions', async () => ({
  ...(await vi.importActual<Record<string, unknown>>('./paymentTransactions')),
  createLinkedExpenseRecord: vi.fn(async () => 'new-expense'),
  createLinkedIncomeRecord: vi.fn(async () => 'new-income'),
  deleteLinkedRecord: vi.fn()
}))

vi.mock('./settings', () => ({
  getSettings: () => ({
    forms: [
      { id: 'f-exp', type: 'expense' },
      { id: 'f-inc', type: 'income' }
    ]
  })
}))

vi.mock('./sheets', () => ({ fetchRecords: vi.fn() }))

const params = { title: 'بدهی: علی', amount: 500_000, category: 'سایر' }

const withAccount: SettleOptions = {
  date: '2026-10-10',
  walletAccount: 'acc-1',
  walletApply: 'بله'
}

describe('createLinkedRecordWithWallet', () => {
  beforeEach(() => vi.clearAllMocks())

  it('writes the record with the chosen date and account and moves the balance', async () => {
    const id = await createLinkedRecordWithWallet('s', 'expense', params, withAccount)

    expect(id).toBe('new-expense')
    expect(createLinkedExpenseRecord).toHaveBeenCalledWith(
      's',
      expect.objectContaining({ date: '2026-10-10', walletAccount: 'acc-1', walletApply: 'بله' })
    )
    expect(settleEntryWallet).toHaveBeenCalledWith(
      's',
      'expense',
      expect.objectContaining({ walletAccount: 'acc-1', amount: 500_000 }),
      undefined,
      'new-expense'
    )
  })

  it('creates an income record for an income settlement', async () => {
    await createLinkedRecordWithWallet('s', 'income', params, withAccount)

    expect(createLinkedIncomeRecord).toHaveBeenCalledTimes(1)
    expect(createLinkedExpenseRecord).not.toHaveBeenCalled()
  })

  it('leaves the balance alone without an account or with «اثر بر موجودی» off', async () => {
    await createLinkedRecordWithWallet('s', 'expense', params, {
      ...withAccount,
      walletAccount: '',
      walletApply: 'خیر'
    })
    await createLinkedRecordWithWallet('s', 'expense', params, {
      ...withAccount,
      walletApply: 'خیر'
    })

    expect(createLinkedExpenseRecord).toHaveBeenCalledTimes(2)
    expect(settleEntryWallet).not.toHaveBeenCalled()
  })

  it('without options keeps the old behavior: a plain record, no balance move', async () => {
    await createLinkedRecordWithWallet('s', 'expense', params)

    expect(createLinkedExpenseRecord).toHaveBeenCalledWith('s', params)
    expect(settleEntryWallet).not.toHaveBeenCalled()
  })

  it('link mode creates no record, moves no balance and returns the linked id', async () => {
    const id = await createLinkedRecordWithWallet('s', 'expense', params, {
      ...withAccount,
      linkRecordId: 'sms-1'
    })

    expect(id).toBe('sms-1')
    expect(createLinkedExpenseRecord).not.toHaveBeenCalled()
    expect(settleEntryWallet).not.toHaveBeenCalled()
  })
})

describe('unpaying a settlement', () => {
  beforeEach(() => vi.clearAllMocks())

  const stored = (id: string, title: string) =>
    vi.mocked(fetchRecords).mockResolvedValue([{ id, values: { title } }] as never)

  it('deletes a record the app created (title with the module prefix)', async () => {
    stored('r1', 'بدهی: علی')

    await deleteLinkedRecordWithWallet('s', 'expense', 'r1', 'بدهی: ')

    expect(deleteLinkedRecord).toHaveBeenCalledWith('s', 'expense', 'r1')
    expect(await isLinkedForeignRecord('s', 'expense', 'r1', 'بدهی: ')).toBe(false)
  })

  it('keeps a linked record by default and deletes it when asked to', async () => {
    stored('sms-1', 'برداشت از کارت')

    expect(await isLinkedForeignRecord('s', 'expense', 'sms-1', 'بدهی: ')).toBe(true)

    await deleteLinkedRecordWithWallet('s', 'expense', 'sms-1', 'بدهی: ')
    expect(deleteLinkedRecord).not.toHaveBeenCalled()

    await deleteLinkedRecordWithWallet('s', 'expense', 'sms-1', 'بدهی: ', 'delete')
    expect(deleteLinkedRecord).toHaveBeenCalledWith('s', 'expense', 'sms-1')
  })

  it('matches a building repayment by its new title and by the old one', async () => {
    const prefixes = ['بازپرداخت به ', 'بدهی: ']

    for (const title of ['بازپرداخت به مدیر · لامپ', 'بدهی: لامپ']) {
      stored('r1', title)
      expect(await isLinkedForeignRecord('s', 'expense', 'r1', prefixes)).toBe(false)
    }

    await deleteLinkedRecordWithWallet('s', 'expense', 'r1', prefixes)
    expect(deleteLinkedRecord).toHaveBeenCalledWith('s', 'expense', 'r1')
  })

  it('still treats a record outside every prefix as a linked one', async () => {
    stored('sms-1', 'برداشت از کارت')

    expect(await isLinkedForeignRecord('s', 'expense', 'sms-1', ['بازپرداخت به ', 'بدهی: '])).toBe(
      true
    )
  })

  it('does nothing without a linked record id', async () => {
    await deleteLinkedRecordWithWallet('s', 'expense', '', 'بدهی: ')

    expect(deleteLinkedRecord).not.toHaveBeenCalled()
  })
})

describe('unpaying a record that sits in the other form', () => {
  beforeEach(() => vi.clearAllMocks())

  /** `found` says which forms hold the record; deleting from any other form finds nothing. */
  const holders = (found: ('expense' | 'income')[], title = 'چک: ۱ — علی') => {
    vi.mocked(deleteLinkedRecord).mockImplementation(
      async (_id: string, type: 'income' | 'expense') =>
        ({ walletAccount: '', walletApply: '', found: found.includes(type) } as never)
    )
    vi.mocked(fetchRecords).mockImplementation(
      async (_id: string, form: { type?: string }) =>
        (found.includes(form.type as 'expense' | 'income')
          ? [{ id: 'r1', values: { title } }]
          : []) as never
    )
  }

  it('reverses it there, with that form’s balance effect, when the expected form lacks it', async () => {
    holders(['expense'])

    expect(await deleteLinkedRecordWithWallet('s', 'income', 'r1', 'چک: ')).toBe(true)
    expect(vi.mocked(deleteLinkedRecord).mock.calls.map(call => call[1])).toEqual([
      'income',
      'expense'
    ])
  })

  it('does not look further when the expected form has it', async () => {
    holders(['income'])

    expect(await deleteLinkedRecordWithWallet('s', 'income', 'r1', 'چک: ')).toBe(true)
    expect(deleteLinkedRecord).toHaveBeenCalledTimes(1)
  })

  it('reports that nothing was found in either form', async () => {
    holders([])

    expect(await deleteLinkedRecordWithWallet('s', 'income', 'r1', 'چک: ')).toBe(false)
    expect(deleteLinkedRecord).toHaveBeenCalledTimes(2)
  })

  it('does not take a record the user linked in the other form unless asked to', async () => {
    holders(['expense'], 'برداشت از کارت')

    expect(await deleteLinkedRecordWithWallet('s', 'income', 'r1', 'چک: ')).toBe(true)
    expect(vi.mocked(deleteLinkedRecord).mock.calls.map(call => call[1])).toEqual(['income'])

    vi.mocked(deleteLinkedRecord).mockClear()
    expect(await deleteLinkedRecordWithWallet('s', 'income', 'r1', 'چک: ', 'delete')).toBe(true)
    expect(vi.mocked(deleteLinkedRecord).mock.calls.map(call => call[1])).toEqual([
      'income',
      'expense'
    ])
  })
})
