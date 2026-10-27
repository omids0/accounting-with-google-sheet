import { describe, expect, it } from 'vitest'

import { walletAtDate, walletAtMonthEnd, walletForPeriod, type WalletFlow } from './walletAtDate'

const rec = (date: string, amount: number) => ({ values: { date, amount: String(amount) } })

const flow: WalletFlow = {
  incomeRecords: [rec('2026-10-10', 1_000), rec('2026-10-15', 2_000), rec('2026-10-24', 5_000)],
  expenseRecords: [rec('2026-08-01', 100), rec('2026-10-25', 300)],
  incomeDateField: 'date',
  expenseDateField: 'date'
}

describe('walletAtDate', () => {
  it('goes back from today by the net of every record after the day', () => {
    expect(walletAtDate(100_000, flow, '2026-10-22')).toBe(95_300)
    expect(walletAtDate(100_000, flow, '2026-10-26')).toBe(100_000)
  })

  it('keeps records dated on the end day (end is inclusive)', () => {
    expect(walletAtDate(100_000, flow, '2026-10-10')).toBe(93_300)
    expect(walletAtDate(100_000, flow, '2026-10-09')).toBe(92_300)
  })

  it('works before the first record and mid-month', () => {
    expect(walletAtDate(100_000, flow, '2024-02-01')).toBe(92_400)
    expect(walletAtDate(100_000, flow, '2026-09-30')).toBe(92_300)
  })

  it('skips records without a readable date', () => {
    const odd: WalletFlow = { ...flow, incomeRecords: [rec('', 9_999), rec('x', 1)] }

    expect(walletAtDate(50, odd, '2026-01-01')).toBe(50 + 400)
  })

  it('returns null for an end that is not a day', () => {
    expect(walletAtDate(100, flow, '')).toBeNull()
    expect(walletAtDate(100, flow, 'مهر')).toBeNull()
  })
})

describe('walletForPeriod', () => {
  it('keeps today for a period that reaches today or the future', () => {
    expect(walletForPeriod(100_000, flow, '2026-10-27', '2026-10-27')).toEqual({
      walletTotal: 100_000
    })
    expect(walletForPeriod(100_000, flow, '2026-12-29', '2026-10-27')).toEqual({
      walletTotal: 100_000
    })
  })

  it('uses the end-of-period wallet and names the day for a period that ended', () => {
    expect(walletForPeriod(100_000, flow, '2026-10-22', '2026-10-27')).toEqual({
      walletTotal: 95_300,
      walletAsOf: '2026-10-22'
    })
  })

  it('falls back to today when the end cannot be read', () => {
    expect(walletForPeriod(100_000, flow, '', '2026-10-27')).toEqual({ walletTotal: 100_000 })
    expect(walletForPeriod(100_000, flow, 'oops', '2026-10-27')).toEqual({ walletTotal: 100_000 })
  })
})

describe('walletAtMonthEnd', () => {
  it('subtracts the net of every later month only', () => {
    const net = new Map([
      ['1405-06', { income: 10, expense: 1 }],
      ['1405-07', { income: 500, expense: 200 }],
      ['1405-08', { income: 50, expense: 5 }]
    ])

    expect(walletAtMonthEnd(1_000, net, '1405-07')).toBe(955)
    expect(walletAtMonthEnd(1_000, net, '1405-08')).toBe(1_000)
  })
})
