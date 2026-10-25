import { describe, expect, it } from 'vitest'

import {
  balanceOfRows,
  settlementRecord,
  splitSettlements,
  type SharedRow
} from './sharedSettlement'
import { SETTLEMENT_CATEGORY } from '../utils/protectedCategories'

const A = 'a@mail.com'
const B = 'b@mail.com'

const expense = (amount: number, payer: string, split = 'equal'): SharedRow => ({
  type: 'expense',
  values: { category: 'خوراک', amount: String(amount), sharedPayer: payer, sharedSplit: split }
})

/** The prototype's month as raw sheet rows, the settlement among them. */
const ROWS: SharedRow[] = [
  expense(18_000_000, A),
  expense(1_850_000, B),
  expense(640_000, A),
  expense(420_000, A, `only:${B}`),
  expense(1_350_000, B),
  { type: 'expense', values: settlementRecord(B, A, 5_000_000, '2026-10-20', B) },
  {
    type: 'income',
    values: { category: 'حقوق', amount: '60000000', sharedPayer: A, sharedSplit: '' }
  }
]

describe('balanceOfRows', () => {
  it('counts the settlement once and never as an expense', () => {
    const balance = balanceOfRows(ROWS, [A, B])

    expect(balance.net).toEqual({ [A]: 3_140_000, [B]: -3_140_000 })
    expect(balance.paid).toEqual({ [A]: 19_060_000, [B]: 3_200_000 })
    expect(balance.share).toEqual({ [A]: 10_920_000, [B]: 11_340_000 })
    expect(balance.skipped).toBe(0)
  })

  it('ignores a malformed «تسویه» row on both sides', () => {
    const settle = (values: Record<string, string>): SharedRow => ({
      type: 'expense',
      values: { category: SETTLEMENT_CATEGORY, amount: '700', ...values }
    })
    const malformed = [
      settle({ sharedPayer: B, sharedSplit: 'equal' }),
      settle({ sharedPayer: '', sharedSplit: `only:${A}` }),
      settle({ sharedPayer: B, sharedSplit: `only:${A}`, amount: '0' }),
      { type: 'income' as const, values: { category: SETTLEMENT_CATEGORY, amount: '700' } }
    ]

    expect(splitSettlements(malformed)).toEqual({ records: [], settlements: [] })
    expect(balanceOfRows([...ROWS, ...malformed], [A, B])).toEqual(balanceOfRows(ROWS, [A, B]))
  })

  it('drops an expense without a payer on purpose: nobody can be credited for it', () => {
    const balance = balanceOfRows([expense(900, '')], [A, B])

    expect(balance.net).toEqual({ [A]: 0, [B]: 0 })
    expect(balance.skipped).toBe(1)
  })
})
