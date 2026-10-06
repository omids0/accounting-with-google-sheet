import { describe, expect, it } from 'vitest'

import { buildGroupSummary } from './dangSplitMath'
import type { DangSplitAllocation, DangSplitExpense, DangSplitPerson } from '../types/dangSplit'

function person(id: string): DangSplitPerson {
  return {
    id,
    groupId: 'g1',
    name: id,
    categoryId: '',
    defaultWeight: 1,
    deposit: 0,
    paidAmount: 0,
    settledAt: '',
    note: ''
  }
}

function expense(id: string, amount: number, payerId: string): DangSplitExpense {
  return { id, groupId: 'g1', title: id, date: '', amount, note: '', payerId, createdAt: '' }
}

function allocation(expenseId: string, personId: string, weight = 1): DangSplitAllocation {
  return { id: `${expenseId}-${personId}`, groupId: 'g1', expenseId, personId, weight }
}

const balanceSum = (summary: ReturnType<typeof buildGroupSummary>) =>
  summary.people.reduce((sum, item) => sum + item.balance, 0)

describe('buildGroupSummary balances', () => {
  const expenses = [expense('dinner', 300_000, 'ali'), expense('taxi', 100_001, 'reza')]

  const allocations = ['ali', 'reza', 'sara'].flatMap(id => [
    allocation('dinner', id),
    allocation('taxi', id, id === 'sara' ? 2 : 1)
  ])

  it('sum to zero for a closed group', () => {
    const summary = buildGroupSummary({
      people: [person('ali'), person('reza'), person('sara')],
      expenses,
      allocations
    })

    expect(balanceSum(summary)).toBe(0)
    expect(summary.balance).toBe(0)
    expect(summary.total).toBe(400_001)
  })

  it('still sum to zero after the payer of an expense is removed', () => {
    // «علی» حذف شده: تخصیص‌هایش هم با او پاک شده‌اند ولی قلم «شام» با پرداخت‌کننده‌ی او مانده است
    const summary = buildGroupSummary({
      people: [person('reza'), person('sara')],
      expenses,
      allocations: allocations.filter(item => item.personId !== 'ali')
    })

    expect(balanceSum(summary)).toBe(0)
    expect(summary.total).toBe(100_001)
    expect(summary.unallocatedTotal).toBe(0)
    expect(summary.people.every(item => item.breakdown.every(b => b.expenseId === 'taxi'))).toBe(
      true
    )
  })

  it('still sum to zero after a non-payer is removed', () => {
    const summary = buildGroupSummary({
      people: [person('ali'), person('reza')],
      expenses,
      allocations: allocations.filter(item => item.personId !== 'sara')
    })

    expect(balanceSum(summary)).toBe(0)
    expect(summary.total).toBe(400_001)
  })
})
