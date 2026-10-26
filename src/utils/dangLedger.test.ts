import { describe, expect, it } from 'vitest'

import {
  canSetDangAmount,
  dangPaidAmount,
  dangPaidColumns,
  dangPaymentStatus,
  dangRemaining,
  isDangSettled,
  unpaidDangTotal
} from './dangLedger'

const pay = (id: string, amount: number, paidAt = '2026-10-02', transactionRecordId = '') => ({
  id,
  amount,
  paidAt,
  note: '',
  ...(transactionRecordId ? { transactionRecordId } : {})
})

describe('debt ledger helpers', () => {
  it('adds up payments and the remainder', () => {
    const dang = { amount: 100, payments: [pay('a', 30), pay('b', 20)] }

    expect(dangPaidAmount(dang)).toBe(50)
    expect(dangRemaining(dang)).toBe(50)
    expect(isDangSettled(dang)).toBe(false)
  })

  it('is settled only when something was owed and it is all paid', () => {
    expect(isDangSettled({ amount: 100, payments: [pay('a', 100)] })).toBe(true)
    expect(isDangSettled({ amount: 0, payments: [] })).toBe(false)
  })

  it('refuses an amount below what is already paid', () => {
    const dang = { payments: [pay('a', 60)] }

    expect(canSetDangAmount(dang, 59)).toBe(false)
    expect(canSetDangAmount(dang, 60)).toBe(true)
    expect(canSetDangAmount({ payments: [] }, 0)).toBe(true)
  })

  it('totals the remainder of the debts not yet settled', () => {
    expect(
      unpaidDangTotal([
        { amount: 100, payments: [pay('a', 40)] },
        { amount: 50, payments: [pay('b', 50)] },
        { amount: 70, payments: [] }
      ])
    ).toBe(130)
  })

  it('writes the legacy columns from the last payment once settled', () => {
    expect(
      dangPaidColumns({
        amount: 100,
        payments: [pay('a', 40, '2026-10-02', 'r1'), pay('b', 60, '2026-10-05', 'r2')]
      })
    ).toEqual({ paid: true, paidAt: '2026-10-05', transactionRecordId: 'r2' })
    expect(dangPaidColumns({ amount: 100, payments: [pay('a', 40, '2026-10-02', 'r1')] })).toEqual({
      paid: false,
      paidAt: '',
      transactionRecordId: ''
    })
  })
})

describe('dangPaymentStatus', () => {
  it('tells untouched, partly paid and settled debts apart', () => {
    expect(dangPaymentStatus({ amount: 100, payments: [] })).toBe('unpaid')
    expect(dangPaymentStatus({ amount: 100, payments: [pay('a', 1)] })).toBe('partial')
    expect(dangPaymentStatus({ amount: 100, payments: [pay('a', 60), pay('b', 40)] })).toBe(
      'settled'
    )
    // A debt of 0 is never «settled», and nothing was paid on it.
    expect(dangPaymentStatus({ amount: 0, payments: [] })).toBe('unpaid')
  })
})
