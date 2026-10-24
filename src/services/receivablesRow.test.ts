import { describe, expect, it } from 'vitest'

import { detectReceivableRowLayout, receivableToRow, rowToReceivable } from './receivablesRow'

const PAYMENTS = '[{"id":"p1","amount":500,"date":"1403/01/01"}]'

const legacyRow = (amount: string) => ['r1', 't', 'علی', amount, '1403/01/01', 'یادداشت', PAYMENTS]

const withCategoryRow = (amount: string) => [
  'r2',
  't',
  'علی',
  'شخصی',
  amount,
  '1403/01/01',
  'یادداشت',
  PAYMENTS
]

const withTitleRow = (amount: string, debtor = 'علی') => [
  'r3',
  't',
  'قرض',
  debtor,
  'شخصی',
  amount,
  '1403/01/01',
  'یادداشت',
  PAYMENTS,
  'زیر'
]

describe('detectReceivableRowLayout', () => {
  it('keeps the historical layout for plain-number amounts', () => {
    expect(detectReceivableRowLayout(legacyRow('1500000'))).toBe('legacy')
    expect(detectReceivableRowLayout(withCategoryRow('1500000'))).toBe('withCategory')
    expect(detectReceivableRowLayout(withTitleRow('1500000'))).toBe('withTitle')
  })

  it('detects layouts when the amount is formatted or uses Persian digits', () => {
    expect(detectReceivableRowLayout(legacyRow('1,500,000'))).toBe('legacy')
    expect(detectReceivableRowLayout(legacyRow('۱٬۵۰۰٬۰۰۰'))).toBe('legacy')
    expect(detectReceivableRowLayout(withTitleRow('1,500,000'))).toBe('withTitle')
    expect(detectReceivableRowLayout(withTitleRow('۱۵۰۰۰۰۰'))).toBe('withTitle')
    expect(detectReceivableRowLayout(withCategoryRow('۱,۵۰۰,۰۰۰'))).toBe('withCategory')
  })

  it('does not mistake a numeric-looking debtor for a legacy amount', () => {
    expect(detectReceivableRowLayout(withTitleRow('۱,۵۰۰', '۱۲۳'))).toBe('withTitle')
  })
})

describe('rowToReceivable', () => {
  it('reads plain amounts exactly as Number() did', () => {
    expect(rowToReceivable(legacyRow('1500000'), 2).amount).toBe(1500000)
    expect(rowToReceivable(withCategoryRow('250000'), 2).amount).toBe(250000)
    expect(rowToReceivable(withTitleRow('99.5'), 2).amount).toBe(99.5)
    expect(rowToReceivable(withTitleRow(''), 2).amount).toBe(0)
  })

  it('reads formatted amounts that used to become 0 or the wrong column', () => {
    const legacy = rowToReceivable(legacyRow('1,500,000'), 2)

    expect(legacy.amount).toBe(1500000)
    expect(legacy.debtor).toBe('علی')
    expect(legacy.payments).toHaveLength(1)

    const titled = rowToReceivable(withTitleRow('۲٬۰۰۰٬۰۰۰'), 3)

    expect(titled.amount).toBe(2000000)
    expect(titled.title).toBe('قرض')
    expect(titled.subCategory).toBe('زیر')
  })
})

describe('building charge columns', () => {
  const charge = {
    id: 'r9',
    createdAt: 't',
    title: 'شارژ مهر · واحد ۳',
    debtor: 'علی',
    category: 'شارژ ساختمان',
    amount: 1500000,
    borrowDate: '1405/07/10',
    note: '',
    payments: [],
    reference: 'charge:u3:1405-07',
    debtorId: 'cp-1'
  }

  it('write the reference and the debtor id after the writer column', () => {
    const row = receivableToRow(charge)

    expect(row).toHaveLength(13)
    expect(row[10]).toBe('')
    expect(row.slice(11)).toEqual(['charge:u3:1405-07', 'cp-1'])
  })

  it('read them back, and keep a plain receivable free of them', () => {
    const row = receivableToRow(charge)

    expect(rowToReceivable(row, 2)).toMatchObject({
      reference: 'charge:u3:1405-07',
      debtorId: 'cp-1',
      debtor: 'علی'
    })
    expect(rowToReceivable(withTitleRow('1500000'), 2)).toMatchObject({
      reference: '',
      debtorId: ''
    })
    expect(
      receivableToRow({ ...charge, reference: undefined, debtorId: undefined }).slice(11)
    ).toEqual(['', ''])
  })

  it('carry the writer in its own column', () => {
    expect(receivableToRow({ ...charge, writer: 'a@b.c' })[10]).toBe('a@b.c')
  })
})
