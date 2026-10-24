import { describe, expect, it } from 'vitest'

import { totalChecksInRange, totalUnpaidChecksInRange } from './checks'
import type { Check } from '../types'

const base: Check = {
  id: 'c1',
  createdAt: '',
  checkNumber: '123',
  direction: 'paid',
  counterparty: 'علی',
  amount: 500_000,
  creationDate: '2026-10-01',
  dueDate: '2026-10-20',
  paid: false,
  paidAt: ''
}

describe('totals', () => {
  const range = { start: '2026-10-01', end: '2026-10-31' }

  const checks: Check[] = [
    { ...base, id: 'a', amount: 100 },
    { ...base, id: 'b', amount: 40, direction: 'received' },
    { ...base, id: 'c', amount: 7, direction: 'received', paid: true },
    { ...base, id: 'd', amount: 1000, dueDate: '2026-12-01' }
  ]

  it('sums all, or one type', () => {
    expect(totalChecksInRange(checks, range)).toBe(147)
    expect(totalChecksInRange(checks, range, 'paid')).toBe(100)
    expect(totalChecksInRange(checks, range, 'received')).toBe(47)
  })

  it('leaves passed checks out of the unpaid sums', () => {
    expect(totalUnpaidChecksInRange(checks, range)).toBe(140)
    expect(totalUnpaidChecksInRange(checks, range, 'paid')).toBe(100)
    expect(totalUnpaidChecksInRange(checks, range, 'received')).toBe(40)
  })
})
