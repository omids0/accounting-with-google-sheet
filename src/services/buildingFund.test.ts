import { beforeEach, describe, expect, it, vi } from 'vitest'

import { monthFlowOf } from './buildingDashboard'
import {
  FUND_CORRECTION_SUBCATEGORY,
  fundCorrection,
  monthlyFlowSeries,
  recordFundCorrection
} from './buildingFund'
import type { RecordRow } from '../types'

const calls = vi.hoisted(() => ({
  income: [] as unknown[],
  expense: [] as unknown[],
  wallet: [] as unknown[]
}))

vi.mock('./paymentTransactions', () => ({
  createLinkedIncomeRecord: async (_id: string, params: unknown) => {
    calls.income.push(params)

    return 'rec-income'
  },
  createLinkedExpenseRecord: async (_id: string, params: unknown) => {
    calls.expense.push(params)

    return 'rec-expense'
  }
}))

vi.mock('./recordWallet', () => ({
  applyWalletChanges: async (...args: unknown[]) => {
    calls.wallet.push(args)
  },
  recordLedgerContext: (values: { title: string; date: string }, source: string, id: string) => ({
    title: values.title,
    date: values.date,
    source,
    recordId: id
  })
}))

vi.mock('./activityLog', () => ({ logItemActivity: vi.fn() }))

vi.mock('./sheets', () => ({
  appendSheetRow: vi.fn(),
  fetchSheetRows: async () => []
}))

vi.mock('./wallet', () => ({ accountToRow: vi.fn(), updateWalletAccount: vi.fn() }))

const account = { id: 'a1', title: 'ملت', balance: 17_200_000 }

beforeEach(() => {
  calls.income.length = 0
  calls.expense.length = 0
  calls.wallet.length = 0
})

describe('fundCorrection', () => {
  it('turns a shortfall into one expense in «اصلاح موجودی» on that account', () => {
    const correction = fundCorrection(account, 17_050_000, ' کارمزد بانک ', '2026-10-12')

    expect(correction).toEqual({
      type: 'expense',
      signedAmount: -150_000,
      params: {
        title: 'اصلاح موجودی · ملت',
        amount: 150_000,
        category: 'اصلاح موجودی',
        subCategory: FUND_CORRECTION_SUBCATEGORY,
        note: 'کارمزد بانک',
        date: '2026-10-12',
        walletAccount: 'a1',
        walletApply: 'بله'
      }
    })
  })

  it('turns a surplus into an income and nothing into nothing', () => {
    expect(fundCorrection(account, 17_500_000, '', '2026-10-12')).toMatchObject({
      type: 'income',
      signedAmount: 300_000,
      params: { amount: 300_000 }
    })
    expect(fundCorrection(account, 17_200_000, '', '2026-10-12')).toBeNull()
  })
})

describe('recordFundCorrection', () => {
  it('writes exactly one record and moves the balance by the signed difference', async () => {
    const id = await recordFundCorrection('sheet', account, 17_050_000, 'کارمزد', '2026-10-12')

    expect(id).toBe('rec-expense')
    expect(calls.expense).toHaveLength(1)
    expect(calls.income).toHaveLength(0)
    expect(calls.wallet).toEqual([
      [
        'sheet',
        null,
        { accountId: 'a1', delta: -150_000 },
        expect.objectContaining({ source: 'اصلاح دستی', recordId: 'rec-expense' })
      ]
    ])
  })

  it('writes nothing when the balances already agree', async () => {
    expect(await recordFundCorrection('sheet', account, 17_200_000, '', '2026-10-12')).toBeNull()
    expect(calls.expense.length + calls.income.length + calls.wallet.length).toBe(0)
  })
})

describe('corrections stay out of the totals', () => {
  const row = (amount: number, date: string, category: string): RecordRow => ({
    id: `${category}${amount}`,
    createdAt: '',
    values: { amount: String(amount), date, category }
  })

  const range = { start: '2026-10-01', end: '2026-10-30' }

  it('skips «اصلاح موجودی», the SMS «تطبیق» and transfers in وصول − هزینه', () => {
    const flow = monthFlowOf(
      {
        records: [
          row(1_000_000, '2026-10-05', 'شارژ ساختمان'),
          row(300_000, '2026-10-06', 'اصلاح موجودی'),
          row(40_000, '2026-10-07', 'تطبیق')
        ]
      },
      {
        records: [
          row(500_000, '2026-10-08', 'آسانسور'),
          row(150_000, '2026-10-09', 'اصلاح موجودی'),
          row(2_400_000, '2026-10-10', 'انتقال')
        ]
      },
      range
    )

    expect(flow).toEqual({ income: 1_000_000, expense: 500_000, expenseCount: 1 })
  })

  it('builds the six-month trend with the same rule', () => {
    const series = monthlyFlowSeries(
      { records: [row(900, '2026-10-05', 'شارژ ساختمان'), row(5, '2026-09-05', 'اصلاح موجودی')] },
      { records: [row(400, '2026-09-20', 'برق'), row(77, '2026-09-21', 'انتقال')] },
      ['1405-06', '1405-07']
    )

    expect(series.map(item => item.monthKey)).toEqual(['1405-06', '1405-07'])
    expect(series.map(item => [item.income, item.expense, item.net])).toEqual([
      [0, 400, -400],
      [900, 0, 900]
    ])
  })
})
