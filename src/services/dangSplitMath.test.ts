import { describe, expect, it } from 'vitest'

import {
  buildGroupSummary,
  resolveEqualWeights,
  resolveManualWeights,
  splitExpenseShares
} from './dangSplitMath'
import type { DangSplitAllocation, DangSplitExpense, DangSplitPerson } from '../types/dangSplit'

function person(id: string, overrides: Partial<DangSplitPerson> = {}): DangSplitPerson {
  return {
    id,
    groupId: 'g1',
    name: id,
    categoryId: '',
    defaultWeight: 1,
    paidAmount: 0,
    settledAt: '',
    note: '',
    ...overrides
  }
}

function expense(id: string, amount: number): DangSplitExpense {
  return {
    id,
    groupId: 'g1',
    title: id,
    date: '2026-09-27',
    amount,
    note: '',
    createdAt: ''
  }
}

function allocation(expenseId: string, personId: string, weight: number): DangSplitAllocation {
  return { id: `${expenseId}-${personId}`, groupId: 'g1', expenseId, personId, weight }
}

describe('splitExpenseShares', () => {
  it('splits equally when weights are equal', () => {
    const shares = splitExpenseShares(300_000, [
      { personId: 'a', weight: 1 },
      { personId: 'b', weight: 1 },
      { personId: 'c', weight: 1 }
    ])

    expect(shares.get('a')).toBe(100_000)
    expect(shares.get('b')).toBe(100_000)
    expect(shares.get('c')).toBe(100_000)
  })

  it('keeps the sum of shares exactly equal to the amount when it does not divide evenly', () => {
    const shares = splitExpenseShares(10_000, [
      { personId: 'a', weight: 1 },
      { personId: 'b', weight: 1 },
      { personId: 'c', weight: 1 }
    ])

    const total = [...shares.values()].reduce((sum, value) => sum + value, 0)

    expect(total).toBe(10_000)
    expect([...shares.values()].sort((a, b) => a - b)).toEqual([3_333, 3_333, 3_334])
  })

  it('gives the remainder to the largest share', () => {
    const shares = splitExpenseShares(1_000, [
      { personId: 'a', weight: 2 },
      { personId: 'b', weight: 1 }
    ])

    expect(shares.get('a')).toBe(667)
    expect(shares.get('b')).toBe(333)
  })

  it('weights shares proportionally', () => {
    const shares = splitExpenseShares(400_000, [
      { personId: 'a', weight: 2 },
      { personId: 'b', weight: 1 },
      { personId: 'c', weight: 1 }
    ])

    expect(shares.get('a')).toBe(200_000)
    expect(shares.get('b')).toBe(100_000)
    expect(shares.get('c')).toBe(100_000)
  })

  it('falls back to an equal split when every weight is zero', () => {
    const shares = splitExpenseShares(300, [
      { personId: 'a', weight: 0 },
      { personId: 'b', weight: 0 }
    ])

    expect(shares.get('a')).toBe(150)
    expect(shares.get('b')).toBe(150)
  })

  it('returns an empty map when nobody is allocated', () => {
    expect(splitExpenseShares(500, []).size).toBe(0)
  })
})

describe('resolveEqualWeights', () => {
  it('uses each person default weight', () => {
    expect(resolveEqualWeights([person('a'), person('b', { defaultWeight: 2 })])).toEqual([
      { personId: 'a', weight: 1 },
      { personId: 'b', weight: 2 }
    ])
  })

  it('treats a non-positive default weight as one', () => {
    expect(resolveEqualWeights([person('a', { defaultWeight: 0 })])).toEqual([
      { personId: 'a', weight: 1 }
    ])
  })
})

describe('resolveManualWeights', () => {
  it('spreads the remaining percentage over the other people by default weight', () => {
    const weights = resolveManualWeights(
      [person('a'), person('b'), person('c', { defaultWeight: 2 })],
      { a: 40 }
    )

    expect(weights).toEqual([
      { personId: 'a', weight: 40 },
      { personId: 'b', weight: 20 },
      { personId: 'c', weight: 40 }
    ])
  })

  it('gives everyone their manual percentage when all are manual', () => {
    expect(resolveManualWeights([person('a'), person('b')], { a: 70, b: 30 })).toEqual([
      { personId: 'a', weight: 70 },
      { personId: 'b', weight: 30 }
    ])
  })

  it('leaves no share for the others when the manual percentages reach 100', () => {
    expect(resolveManualWeights([person('a'), person('b')], { a: 100 })).toEqual([
      { personId: 'a', weight: 100 },
      { personId: 'b', weight: 0 }
    ])
  })

  it('keeps the manual percentages proportional when they exceed 100', () => {
    const weights = resolveManualWeights([person('a'), person('b')], { a: 80, b: 40 })
    const shares = splitExpenseShares(120_000, weights)

    expect(shares.get('a')).toBe(80_000)
    expect(shares.get('b')).toBe(40_000)
  })

  it('falls back to the equal split when no manual percentage is given', () => {
    expect(resolveManualWeights([person('a'), person('b', { defaultWeight: 3 })], {})).toEqual([
      { personId: 'a', weight: 1 },
      { personId: 'b', weight: 3 }
    ])
  })
})

describe('buildGroupSummary', () => {
  const people = [
    person('a', { paidAmount: 100_000 }),
    person('b'),
    person('c', { defaultWeight: 2 })
  ]
  const expenses = [expense('e1', 300_000), expense('e2', 100_000)]
  const allocations = [
    allocation('e1', 'a', 1),
    allocation('e1', 'b', 1),
    allocation('e1', 'c', 1),
    allocation('e2', 'a', 1)
  ]

  it('sums each person share across every expense', () => {
    const summary = buildGroupSummary({ people, expenses, allocations })
    const byId = new Map(summary.people.map(item => [item.personId, item]))

    expect(byId.get('a')?.share).toBe(200_000)
    expect(byId.get('b')?.share).toBe(100_000)
    expect(byId.get('c')?.share).toBe(100_000)
  })

  it('reports balances and statuses', () => {
    const summary = buildGroupSummary({ people, expenses, allocations })
    const byId = new Map(summary.people.map(item => [item.personId, item]))

    expect(byId.get('a')?.balance).toBe(100_000)
    expect(byId.get('a')?.status).toBe('partial')
    expect(byId.get('b')?.status).toBe('unpaid')
  })

  it('marks a person with no allocation as having no share', () => {
    const summary = buildGroupSummary({
      people: [person('z')],
      expenses,
      allocations: []
    })

    expect(summary.people[0].share).toBe(0)
    expect(summary.people[0].status).toBe('none')
  })

  it('marks a fully paid person as settled', () => {
    const summary = buildGroupSummary({
      people: [person('a', { paidAmount: 100_000 })],
      expenses: [expense('e1', 100_000)],
      allocations: [allocation('e1', 'a', 1)]
    })

    expect(summary.people[0].status).toBe('settled')
    expect(summary.settledCount).toBe(1)
  })

  it('totals the group', () => {
    const summary = buildGroupSummary({ people, expenses, allocations })

    expect(summary.total).toBe(400_000)
    expect(summary.paid).toBe(100_000)
    expect(summary.balance).toBe(300_000)
    expect(summary.peopleCount).toBe(3)
    expect(summary.expensesCount).toBe(2)
  })

  it('keeps the breakdown per expense for each person', () => {
    const summary = buildGroupSummary({ people, expenses, allocations })
    const byId = new Map(summary.people.map(item => [item.personId, item]))

    expect(byId.get('a')?.breakdown).toHaveLength(2)
    expect(byId.get('b')?.breakdown).toEqual([
      {
        expenseId: 'e1',
        expenseTitle: 'e1',
        expenseDate: '2026-09-27',
        expenseAmount: 300_000,
        weight: 1,
        weightTotal: 3,
        share: 100_000
      }
    ])
  })

  it('ignores allocations pointing at a removed person', () => {
    const summary = buildGroupSummary({
      people: [person('a')],
      expenses: [expense('e1', 100_000)],
      allocations: [allocation('e1', 'a', 1), allocation('e1', 'gone', 1)]
    })

    expect(summary.people[0].share).toBe(100_000)
  })
})
