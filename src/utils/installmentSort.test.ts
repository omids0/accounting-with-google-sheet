import { describe, expect, it } from 'vitest'

import { compareInstallmentPlans, type InstallmentSortId } from './installmentSort'
import type { SortDirection } from '../hooks/useListSort'
import type { InstallmentPlan } from '../types'

const range = { start: '2026-10-01', end: '2026-10-31' }

function plan(title: string, amount: number, dues: [string, boolean][]): InstallmentPlan {
  return {
    id: title,
    title,
    amount,
    count: dues.length,
    payments: dues.map(([dueDate, paid]) => ({ dueDate, paid }))
  } as unknown as InstallmentPlan
}

const order = (plans: InstallmentPlan[], sort: InstallmentSortId, direction: SortDirection) =>
  [...plans]
    .sort((a, b) => compareInstallmentPlans(a, b, sort, direction, range))
    .map(item => item.title)

describe('compareInstallmentPlans', () => {
  // «early» owes an old unpaid installment in September, but its date in the range is late.
  const early = plan('early', 100, [
    ['2026-09-05', false],
    ['2026-10-28', false]
  ])

  const mid = plan('mid', 300, [['2026-10-15', false]])

  const late = plan('late', 200, [['2026-10-20', false]])

  const done = plan('done', 900, [['2026-10-02', true]])

  it('puts the nearest date in the range first, as the card shows it', () => {
    expect(order([early, late, mid], 'dueDate', 'asc')).toEqual(['mid', 'late', 'early'])
  })

  it('puts the farthest date first when reversed', () => {
    expect(order([mid, early, late], 'dueDate', 'desc')).toEqual(['early', 'late', 'mid'])
  })

  it('keeps finished plans last in either direction', () => {
    expect(order([done, mid, late], 'dueDate', 'asc')).toEqual(['mid', 'late', 'done'])
    expect(order([done, mid, late], 'dueDate', 'desc')).toEqual(['late', 'mid', 'done'])
  })

  it('sorts by amount, and breaks a tie by date', () => {
    const same = plan('same', 200, [['2026-10-03', false]])

    expect(order([late, mid, same], 'amount', 'desc')).toEqual(['mid', 'same', 'late'])
  })

  it('sorts by title', () => {
    expect(order([mid, early, late], 'title', 'asc')).toEqual(['early', 'late', 'mid'])
  })
})
