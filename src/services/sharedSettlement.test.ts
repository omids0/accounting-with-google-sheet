import { describe, expect, it } from 'vitest'

import { computeBalance } from './sharedBalance'
import {
  settlementOf,
  settlementRecord,
  suggestSettlement,
  withoutSettlements
} from './sharedSettlement'
import { SETTLEMENT_CATEGORY } from '../utils/protectedCategories'

const A = 'a@mail.com'
const B = 'b@mail.com'

describe('suggestSettlement', () => {
  it('asks the one who owes to pay the other', () => {
    expect(suggestSettlement({ [A]: 3_140_000, [B]: -3_140_000 })).toEqual({
      from: B,
      to: A,
      amount: 3_140_000
    })
  })

  it('suggests nothing when nobody owes', () => {
    expect(suggestSettlement({ [A]: 0, [B]: 0 })).toBeNull()
    expect(suggestSettlement({})).toBeNull()
  })
})

describe('settlementRecord', () => {
  it('writes a «تسویه» expense from the payer to the receiver, with no wallet field', () => {
    const record = settlementRecord(B, A, 5_000_000, '2026-10-20')

    expect(record).toMatchObject({
      date: '2026-10-20',
      category: SETTLEMENT_CATEGORY,
      amount: 5_000_000,
      sharedPayer: B,
      sharedSplit: `only:${A}`
    })
    expect(Object.keys(record).some(key => key.startsWith('wallet'))).toBe(false)
  })

  it('reads back as the same settlement, and moves the balance like one', () => {
    const record = settlementRecord(B, A, 5_000_000, '2026-10-20')
    const settlement = settlementOf(record)

    expect(settlement).toEqual({ from: B, to: A, amount: 5_000_000 })
    expect(computeBalance([], [settlement!], [A, B]).net).toEqual({
      [A]: -5_000_000,
      [B]: 5_000_000
    })
  })

  it('reads an ordinary record as no settlement', () => {
    expect(settlementOf({ category: 'خوراک', amount: 10, sharedPayer: A })).toBeNull()
  })

  it('refuses a zero amount or a payment to oneself', () => {
    expect(() => settlementRecord(A, B, 0, '2026-10-20')).toThrow()
    expect(() => settlementRecord(A, A, 10, '2026-10-20')).toThrow()
  })
})

describe('withoutSettlements', () => {
  const row = (category: string) => ({ id: category, createdAt: '', values: { category } })
  const records = {
    incomeRecords: [row('حقوق')],
    expenseRecords: [row('خوراک'), row(SETTLEMENT_CATEGORY)],
    incomeDateField: 'date',
    expenseDateField: 'date'
  }

  it('drops settlements from a shared account’s flow', () => {
    const shared = withoutSettlements(records, 'shared')

    expect(shared.expenseRecords.map(item => item.values.category)).toEqual(['خوراک'])
    expect(shared.incomeRecords).toHaveLength(1)
  })

  it('never hijacks a personal or building category named «تسویه»', () => {
    expect(withoutSettlements(records, 'personal')).toBe(records)
    expect(withoutSettlements(records, 'building')).toBe(records)
  })
})
