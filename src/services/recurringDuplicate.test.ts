import { describe, expect, it } from 'vitest'

import type { LedgerEntry } from './recordDuplicates'
import { findExistingRecordForRecurring, findRecurringForSmsRecord } from './recurringDuplicate'
import type { RecurringItem } from '../types'

const item = (patch: Partial<RecurringItem> = {}): RecurringItem => ({
  id: 'r1',
  createdAt: 't',
  type: 'income',
  category: 'حقوق',
  subCategory: '',
  accountId: 'acc',
  amount: 38_000_000,
  title: 'کمک‌هزینه',
  dayOfMonth: 1,
  mode: 'reminder',
  lastPosted: '',
  active: true,
  ...patch
})

const record = (patch: Partial<LedgerEntry> = {}): LedgerEntry => ({
  type: 'income',
  amount: 38_000_000,
  date: '2026-10-23',
  accountId: 'acc',
  id: 'x1',
  category: 'حقوق',
  title: 'کمک‌هزینه',
  ...patch
})

const DUE = '2026-10-23'

describe('findExistingRecordForRecurring', () => {
  it('finds the SMS record of the same money on the due day', () => {
    expect(findExistingRecordForRecurring(item(), DUE, [record()])?.id).toBe('x1')
  })

  it('counts a record two days away, not three', () => {
    expect(
      findExistingRecordForRecurring(item(), DUE, [record({ date: '2026-10-25' })])
    ).not.toBeNull()
    expect(
      findExistingRecordForRecurring(item(), DUE, [record({ date: '2026-10-21' })])
    ).not.toBeNull()
    expect(findExistingRecordForRecurring(item(), DUE, [record({ date: '2026-10-26' })])).toBeNull()
  })

  it('the same amount on another day, outside the window, is not a duplicate', () => {
    expect(findExistingRecordForRecurring(item(), DUE, [record({ date: '2026-10-10' })])).toBeNull()
  })

  it('needs the same amount to the rial and the same type', () => {
    expect(findExistingRecordForRecurring(item(), DUE, [record({ amount: 38_000_001 })])).toBeNull()
    expect(findExistingRecordForRecurring(item(), DUE, [record({ type: 'expense' })])).toBeNull()
  })

  it('two items with one amount: each only matches its own category', () => {
    const rent = item({ id: 'a', type: 'expense', category: 'اجاره', title: 'اجاره', amount: 5 })
    const loan = item({ id: 'b', type: 'expense', category: 'قسط', title: 'قسط', amount: 5 })
    const paidRent = record({ type: 'expense', amount: 5, category: 'اجاره', title: 'اجاره' })

    expect(findExistingRecordForRecurring(rent, DUE, [paidRent])).not.toBeNull()
    expect(findExistingRecordForRecurring(loan, DUE, [paidRent])).toBeNull()
  })

  it('another account is another payment; a record without an account still counts', () => {
    expect(findExistingRecordForRecurring(item(), DUE, [record({ accountId: 'other' })])).toBeNull()
    expect(findExistingRecordForRecurring(item(), DUE, [record({ accountId: '' })])).not.toBeNull()
  })

  it('one record serves one item of the run', () => {
    expect(findExistingRecordForRecurring(item(), DUE, [record()], new Set(['x1']))).toBeNull()
  })

  it('prefers the record with the item title, then the nearer day', () => {
    const found = findExistingRecordForRecurring(item(), DUE, [
      record({ id: 'far', date: '2026-10-24' }),
      record({ id: 'other-title', title: 'چیز دیگر' }),
      record({ id: 'near' })
    ])

    expect(found?.id).toBe('near')
  })
})

describe('findRecurringForSmsRecord', () => {
  const sms = {
    type: 'income' as const,
    amount: 38_000_000,
    accountId: 'acc',
    category: 'حقوق',
    title: 'کمک‌هزینه',
    date: '2026-10-23'
  }
  const MONTH = '1405-08'

  it('finds the open item of this month with the same amount, account and category', () => {
    expect(findRecurringForSmsRecord(sms, [item()], MONTH)?.id).toBe('r1')
  })

  it('leaves an item already posted or skipped this month alone', () => {
    expect(findRecurringForSmsRecord(sms, [item({ lastPosted: MONTH })], MONTH)).toBeNull()
  })

  it('does not match another amount, category, account, type, or a switched-off item', () => {
    expect(findRecurringForSmsRecord({ ...sms, amount: 1 }, [item()], MONTH)).toBeNull()
    expect(findRecurringForSmsRecord({ ...sms, category: 'پاداش' }, [item()], MONTH)).toBeNull()
    expect(findRecurringForSmsRecord({ ...sms, accountId: 'b' }, [item()], MONTH)).toBeNull()
    expect(findRecurringForSmsRecord({ ...sms, type: 'expense' }, [item()], MONTH)).toBeNull()
    expect(findRecurringForSmsRecord(sms, [item({ active: false })], MONTH)).toBeNull()
  })

  it('a record of another month is not this month payment', () => {
    expect(findRecurringForSmsRecord({ ...sms, date: '2026-09-20' }, [item()], MONTH)).toBeNull()
  })

  it('two items of one category: the one with the record title wins', () => {
    const items = [item({ id: 'a', title: 'اضافه‌کار' }), item({ id: 'b' })]

    expect(findRecurringForSmsRecord(sms, items, MONTH)?.id).toBe('b')
  })
})
