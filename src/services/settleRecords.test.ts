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

  it('does nothing without a linked record id', async () => {
    await deleteLinkedRecordWithWallet('s', 'expense', '', 'بدهی: ')

    expect(deleteLinkedRecord).not.toHaveBeenCalled()
  })
})
