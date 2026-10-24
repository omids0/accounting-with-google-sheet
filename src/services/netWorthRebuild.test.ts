import { describe, expect, it } from 'vitest'

import {
  earliestNetMonth,
  rebuildMonthValues,
  rebuildSnapshots,
  type NetWorthRebuildInput
} from './netWorthRebuild'
import type { NetAvailableConfig } from '../types'
import { jalaliToIso } from '../utils/jalaliDate'

const ALL_ON: NetAvailableConfig = {
  assets: { wallet: true, treasury: true, goals: true, receivables: true, checksReceived: true },
  liabilities: { installments: true, dangs: true, checks: true }
}

const day = (month: number, d: number) => jalaliToIso(1405, month, d)

const input: NetWorthRebuildInput = {
  walletTotal: 10_000_000,
  monthlyNet: new Map([
    ['1405-05', { income: 3_000_000, expense: 1_000_000 }],
    ['1405-06', { income: 2_000_000, expense: 3_000_000 }],
    ['1405-07', { income: 4_000_000, expense: 1_000_000 }]
  ]),
  vaultTransactions: [
    {
      id: 'v1',
      createdAt: '',
      assetType: 'usd',
      action: 'buy',
      quantity: 2,
      unitPrice: 800_000,
      transactionDate: day(6, 10),
      note: ''
    }
  ],
  prices: { usd: 1_000_000 },
  goalsTotal: 500_000,
  receivables: [
    {
      id: 'r1',
      createdAt: '',
      title: 'وام علی',
      debtor: 'علی',
      category: '',
      amount: 1_000_000,
      borrowDate: day(5, 15),
      note: '',
      payments: [{ id: 'p1', amount: 400_000, paidAt: day(6, 20), note: '' }]
    }
  ],
  installmentPlans: [
    {
      id: 'i1',
      createdAt: '',
      title: 'وام',
      amount: 300_000,
      count: 1,
      dueDay: 5,
      startDate: day(6, 5),
      note: '',
      payments: [{ n: 1, paid: true, paidAt: '', dueDate: day(6, 5) }]
    }
  ],
  checks: [
    {
      id: 'c1',
      createdAt: '',
      checkNumber: '1',
      direction: 'paid',
      counterparty: '',
      amount: 200_000,
      creationDate: day(4, 1),
      dueDate: day(5, 20),
      paid: true,
      paidAt: ''
    }
  ],
  dangs: [
    {
      id: 'd1',
      createdAt: '',
      title: 'شام',
      category: '',
      counterparty: '',
      amount: 100_000,
      date: day(5, 1),
      note: '',
      paid: false,
      paidAt: ''
    },
    {
      id: 'd2',
      createdAt: '',
      title: 'تسویه‌شده',
      category: '',
      counterparty: '',
      amount: 999_000,
      date: day(5, 1),
      note: '',
      paid: true,
      paidAt: ''
    }
  ]
}

describe('rebuildMonthValues', () => {
  it('works back from today: wallet minus later net, vault by then, dues of the month', () => {
    // Wallet 10M − (−1M + 3M) = 8M; receivable 1M; goals 0.5M. Check 0.2M + dang 0.1M.
    expect(rebuildMonthValues(input, '1405-05', ALL_ON)).toEqual({
      assets: 9_500_000,
      liabilities: 300_000,
      netWorth: 9_200_000
    })
    // Wallet 10M − 3M = 7M; 2 USD at today's 1M; receivable 0.6M after the repayment.
    expect(rebuildMonthValues(input, '1405-06', ALL_ON)).toEqual({
      assets: 10_100_000,
      liabilities: 400_000,
      netWorth: 9_700_000
    })
  })

  it('counts a received check due that month as an asset, never as a debt', () => {
    const withReceived: NetWorthRebuildInput = {
      ...input,
      checks: [
        ...input.checks,
        { ...input.checks[0], id: 'c2', direction: 'received', amount: 150_000, paid: false }
      ]
    }
    const off: NetAvailableConfig = {
      ...ALL_ON,
      assets: { ...ALL_ON.assets, checksReceived: false }
    }

    expect(rebuildMonthValues(withReceived, '1405-05', ALL_ON)).toEqual({
      assets: 9_650_000,
      liabilities: 300_000,
      netWorth: 9_350_000
    })
    expect(rebuildMonthValues(withReceived, '1405-05', off)?.assets).toBe(9_500_000)
  })

  it('follows the net-available switches', () => {
    const walletOnly: NetAvailableConfig = {
      assets: {
        wallet: true,
        treasury: false,
        goals: false,
        receivables: false,
        checksReceived: false
      },
      liabilities: { installments: true, dangs: false, checks: false }
    }

    expect(rebuildMonthValues(input, '1405-06', walletOnly)).toEqual({
      assets: 7_000_000,
      liabilities: 300_000,
      netWorth: 6_700_000
    })
  })

  it('leaves the vault out without prices', () => {
    expect(rebuildMonthValues({ ...input, prices: null }, '1405-06', ALL_ON)?.assets).toBe(
      8_100_000
    )
  })
})

describe('rebuildSnapshots', () => {
  it('marks every month as rebuilt and finds the first record month', () => {
    const rows = rebuildSnapshots(input, ['1405-05', '1405-06'], ALL_ON, 'now')

    expect(rows.map(row => [row.monthKey, row.source, row.recordedAt])).toEqual([
      ['1405-05', 'rebuilt', 'now'],
      ['1405-06', 'rebuilt', 'now']
    ])
    expect(earliestNetMonth(input.monthlyNet)).toBe('1405-05')
    expect(earliestNetMonth(new Map())).toBeNull()
  })
})
