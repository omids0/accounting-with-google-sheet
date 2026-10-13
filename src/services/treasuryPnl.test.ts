import { describe, expect, it } from 'vitest'

import { costBasis, formatPct, realizedInRange, unrealized } from './treasuryPnl'
import type { VaultTransaction } from '../types'

let counter = 0

function tx(
  action: 'buy' | 'sell',
  quantity: number,
  unitPrice: number,
  transactionDate: string
): VaultTransaction {
  counter += 1

  return {
    id: `t${counter}`,
    createdAt: `2026-01-01 00:00:${String(counter).padStart(2, '0')}`,
    assetType: 'gold18',
    action,
    quantity,
    unitPrice,
    transactionDate,
    note: ''
  }
}

describe('costBasis', () => {
  it('uses the price of a single buy', () => {
    const basis = costBasis([tx('buy', 2, 100, '2026-01-01')])

    expect(basis).toEqual({ avgUnitCost: 100, quantity: 2, realized: 0, sells: 0, buys: 1 })
  })

  it('averages two buys at different prices', () => {
    const basis = costBasis([tx('buy', 1, 100, '2026-01-01'), tx('buy', 3, 200, '2026-01-02')])

    expect(basis.avgUnitCost).toBe(175)
    expect(basis.quantity).toBe(4)
  })

  it('replays buy, sell, buy in date order and keeps the average on a sell', () => {
    const basis = costBasis([
      tx('buy', 2, 100, '2026-01-01'),
      tx('buy', 2, 300, '2026-01-10'),
      tx('sell', 1, 250, '2026-01-05')
    ])

    // 01-01 buy 2@100 → 01-05 sell 1@250 (+150) → 01-10 buy 2@300 → avg (100×1 + 300×2) / 3
    expect(basis.realized).toBe(150)
    expect(basis.quantity).toBe(3)
    expect(basis.avgUnitCost).toBeCloseTo(233.333, 2)
  })

  it('clamps a sell larger than what is held', () => {
    const basis = costBasis([tx('buy', 1, 100, '2026-01-01'), tx('sell', 5, 130, '2026-01-02')])

    expect(basis.quantity).toBe(0)
    expect(basis.realized).toBe(30)
    expect(basis.avgUnitCost).toBe(100)
  })

  it('treats zero-price legacy buys as free units', () => {
    const basis = costBasis([tx('buy', 1, 0, '2026-01-01'), tx('buy', 1, 100, '2026-01-02')])

    expect(basis.avgUnitCost).toBe(50)
  })

  it('breaks date ties by creation time', () => {
    const buy = tx('buy', 1, 100, '2026-01-01')
    const sell = tx('sell', 1, 150, '2026-01-01')

    expect(costBasis([sell, buy]).realized).toBe(50)
  })
})

describe('unrealized', () => {
  it('is positive above the average and a percent of the cost', () => {
    const basis = costBasis([tx('buy', 2, 100, '2026-01-01')])

    expect(unrealized(basis, 120)).toEqual({ amount: 40, pct: 20 })
  })

  it('is negative below the average', () => {
    const basis = costBasis([tx('buy', 4, 100, '2026-01-01')])

    expect(unrealized(basis, 90)).toEqual({ amount: -40, pct: -10 })
  })

  it('has no percent without a cost', () => {
    expect(unrealized(costBasis([tx('buy', 1, 0, '2026-01-01')]), 50).pct).toBe(0)
  })
})

describe('realizedInRange', () => {
  const history = [
    tx('buy', 10, 100, '2026-01-01'),
    tx('sell', 1, 120, '2026-02-01'),
    tx('sell', 1, 150, '2026-03-01'),
    tx('sell', 1, 90, '2026-04-01')
  ]

  it('sums the sells inside the range, both ends included', () => {
    expect(realizedInRange(history, { from: '2026-02-01', to: '2026-03-01' })).toBe(70)
  })

  it('excludes sells outside the range', () => {
    expect(realizedInRange(history, { from: '2026-05-01', to: '2026-12-31' })).toBe(0)
    expect(realizedInRange(history, { from: '2026-01-01', to: '2026-12-31' })).toBe(60)
  })
})

describe('formatPct', () => {
  it('shows one decimal with Persian digits', () => {
    expect(formatPct(15.74)).toBe('۱۵٫۷؜٪')
  })

  it('prefixes a typographic minus on losses', () => {
    expect(formatPct(-3.2)).toBe('−۳٫۲؜٪')
  })

  it('has no sign on zero or a loss that rounds to zero', () => {
    expect(formatPct(0)).toBe('۰٫۰؜٪')
    expect(formatPct(-0.04)).toBe('۰٫۰؜٪')
  })
})
