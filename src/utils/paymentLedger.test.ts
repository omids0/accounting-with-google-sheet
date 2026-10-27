import { describe, expect, it } from 'vitest'

import { isComplete, paidTotal, parsePayments, remainingOf } from './paymentLedger'

describe('parsePayments', () => {
  it('reads a JSON array and nothing else', () => {
    expect(parsePayments('[{"id":"a","amount":5}]')).toEqual([{ id: 'a', amount: 5 }])
    expect(parsePayments('')).toEqual([])
    expect(parsePayments(undefined)).toEqual([])
    expect(parsePayments('not json')).toEqual([])
    expect(parsePayments('{"amount":5}')).toEqual([])
  })

  it('drops entries that are not objects', () => {
    expect(parsePayments('[null,3,"x",{"amount":2}]')).toEqual([{ amount: 2 }])
  })
})

describe('ledger arithmetic', () => {
  const payments = [{ amount: 30 }, { amount: 20 }]

  it('adds up what was paid and what is left', () => {
    expect(paidTotal(payments)).toBe(50)
    expect(paidTotal([])).toBe(0)
    expect(remainingOf(80, payments)).toBe(30)
  })

  it('never reports a negative remainder', () => {
    expect(remainingOf(40, payments)).toBe(0)
  })

  it('is complete once nothing is left (an amount of 0 too)', () => {
    expect(isComplete(50, payments)).toBe(true)
    expect(isComplete(51, payments)).toBe(false)
    expect(isComplete(0, [])).toBe(true)
  })
})
