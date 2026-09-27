import { describe, expect, it } from 'vitest'

import { buildGroupSummary } from './dangSplitMath'
import type { DangSplitAllocation, DangSplitExpense, DangSplitPerson } from '../types/dangSplit'

function person(id: string, overrides: Partial<DangSplitPerson> = {}): DangSplitPerson {
  return {
    id,
    groupId: 'g1',
    name: id,
    categoryId: '',
    defaultWeight: 1,
    deposit: 0,
    paidAmount: 0,
    settledAt: '',
    note: '',
    ...overrides
  }
}

function expense(id: string, amount: number, payerId = ''): DangSplitExpense {
  return {
    id,
    groupId: 'g1',
    title: id,
    date: '2026-09-27',
    amount,
    note: '',
    payerId,
    createdAt: ''
  }
}

function allocation(expenseId: string, personId: string, weight: number): DangSplitAllocation {
  return { id: `${expenseId}-${personId}`, groupId: 'g1', expenseId, personId, weight }
}

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

  it('credits the payer of an expense with its full amount', () => {
    const summary = buildGroupSummary({
      people: [person('ali'), person('reza'), person('mom')],
      expenses: [expense('dinner', 300_000, 'ali'), expense('lunch', 300_000, 'reza')],
      allocations: [
        allocation('dinner', 'ali', 1),
        allocation('dinner', 'reza', 1),
        allocation('dinner', 'mom', 1),
        allocation('lunch', 'ali', 1),
        allocation('lunch', 'reza', 1),
        allocation('lunch', 'mom', 1)
      ]
    })
    const byId = new Map(summary.people.map(item => [item.personId, item]))

    expect(byId.get('ali')?.expensePaid).toBe(300_000)
    expect(byId.get('ali')?.credit).toBe(300_000)
    expect(byId.get('ali')?.share).toBe(200_000)
    // ۳۰۰٬۰۰۰ داده و ۲۰۰٬۰۰۰ سهمش بوده، پس ۱۰۰٬۰۰۰ طلبکار است
    expect(byId.get('ali')?.balance).toBe(-100_000)
    expect(byId.get('ali')?.status).toBe('creditor')
    expect(byId.get('mom')?.balance).toBe(200_000)
    expect(byId.get('mom')?.status).toBe('unpaid')
  })

  it('settles a payer whose credit exactly covers their share', () => {
    const summary = buildGroupSummary({
      people: [person('ali')],
      expenses: [expense('dinner', 100_000, 'ali')],
      allocations: [allocation('dinner', 'ali', 1)]
    })

    expect(summary.people[0].credit).toBe(100_000)
    expect(summary.people[0].balance).toBe(0)
    expect(summary.people[0].status).toBe('settled')
  })

  it('treats a cash payment on top of a credit as partial', () => {
    const summary = buildGroupSummary({
      people: [person('ali', { paidAmount: 50_000 }), person('reza')],
      expenses: [expense('dinner', 400_000, 'reza')],
      allocations: [allocation('dinner', 'ali', 1), allocation('dinner', 'reza', 1)]
    })
    const byId = new Map(summary.people.map(item => [item.personId, item]))

    expect(byId.get('ali')?.balance).toBe(150_000)
    expect(byId.get('ali')?.status).toBe('partial')
  })

  it('lets a creditor record money taken back as a negative payment', () => {
    const summary = buildGroupSummary({
      // سهمش ۱۰۰٬۰۰۰ و بستانکاری‌اش ۳۰۰٬۰۰۰ است، پس با پس‌گرفتن ۲۰۰٬۰۰۰ تسویه می‌شود
      people: [person('ali', { paidAmount: -200_000 }), person('reza'), person('mom')],
      expenses: [expense('dinner', 300_000, 'ali')],
      allocations: [
        allocation('dinner', 'ali', 1),
        allocation('dinner', 'reza', 1),
        allocation('dinner', 'mom', 1)
      ]
    })
    const byId = new Map(summary.people.map(item => [item.personId, item]))

    expect(byId.get('ali')?.balance).toBe(0)
    expect(byId.get('ali')?.status).toBe('settled')
  })

  it('reports group totals for credits, cash, debt and unassigned expenses', () => {
    const summary = buildGroupSummary({
      people: [person('ali'), person('reza')],
      expenses: [expense('dinner', 200_000, 'ali'), expense('taxi', 50_000)],
      allocations: [allocation('dinner', 'ali', 1), allocation('dinner', 'reza', 1)]
    })

    expect(summary.total).toBe(250_000)
    expect(summary.covered).toBe(200_000)
    expect(summary.depositTotal).toBe(0)
    expect(summary.debtTotal).toBe(100_000)
    expect(summary.creditTotal).toBe(100_000)
    expect(summary.unallocatedTotal).toBe(50_000)
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
        payerName: '',
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

describe('buildGroupSummary with fund deposits', () => {
  it('counts a deposit as credit and covers the share with it', () => {
    const summary = buildGroupSummary({
      people: [person('ali', { deposit: 2_000_000 }), person('reza', { deposit: 2_000_000 })],
      expenses: [expense('villa', 3_000_000)],
      allocations: [allocation('villa', 'ali', 1), allocation('villa', 'reza', 1)]
    })
    const byId = new Map(summary.people.map(item => [item.personId, item]))

    expect(byId.get('ali')?.deposit).toBe(2_000_000)
    expect(byId.get('ali')?.share).toBe(1_500_000)
    // ۲٬۰۰۰٬۰۰۰ واریز کرده و ۱٬۵۰۰٬۰۰۰ خرج شده، پس ۵۰۰٬۰۰۰ طلبکار است
    expect(byId.get('ali')?.balance).toBe(-500_000)
    expect(byId.get('ali')?.status).toBe('creditor')
    expect(summary.depositTotal).toBe(4_000_000)
    expect(summary.covered).toBe(4_000_000)
  })

  it('adds an out-of-pocket expense to the same person credit', () => {
    const summary = buildGroupSummary({
      people: [person('ali', { deposit: 1_000_000 }), person('reza')],
      expenses: [expense('taxi', 400_000, 'ali')],
      allocations: [allocation('taxi', 'ali', 1), allocation('taxi', 'reza', 1)]
    })
    const byId = new Map(summary.people.map(item => [item.personId, item]))

    expect(byId.get('ali')?.deposit).toBe(1_000_000)
    expect(byId.get('ali')?.expensePaid).toBe(400_000)
    expect(byId.get('ali')?.credit).toBe(1_400_000)
    expect(byId.get('ali')?.balance).toBe(200_000 - 1_400_000)
    expect(byId.get('reza')?.balance).toBe(200_000)
  })
})
