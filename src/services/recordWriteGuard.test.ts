import { describe, expect, it } from 'vitest'

import type { LedgerEntry } from './recordDuplicates'
import {
  findWriteDuplicate,
  recordSourceLabel,
  recordSourceOf,
  type WriteCandidate
} from './recordWriteGuard'

const entry = (patch: Partial<LedgerEntry> = {}): LedgerEntry => ({
  type: 'expense',
  amount: 150_000,
  date: '2026-10-22',
  accountId: 'acc-1',
  id: 'r1',
  category: 'خوراک',
  title: 'قهوه',
  ...patch
})

const candidate = (patch: Partial<WriteCandidate> = {}): WriteCandidate => ({
  type: 'expense',
  amount: 150_000,
  date: '2026-10-22',
  accountId: 'acc-1',
  category: 'خوراک',
  title: 'قهوه',
  ...patch
})

describe('findWriteDuplicate', () => {
  it('finds the same purchase on the same day', () => {
    expect(findWriteDuplicate(candidate(), [entry()])?.id).toBe('r1')
  })

  it('finds it one day away, across a Jalali month boundary (30 مهر / 1 آبان)', () => {
    expect(findWriteDuplicate(candidate({ date: '2026-10-23' }), [entry()])?.id).toBe('r1')
    expect(findWriteDuplicate(candidate({ date: '2026-10-21' }), [entry()])?.id).toBe('r1')
  })

  it('finds it across the Jalali year boundary (29 اسفند 1405 / 1 فروردین 1406)', () => {
    const before = entry({ date: '2027-03-20' })

    expect(findWriteDuplicate(candidate({ date: '2027-03-21' }), [before])?.id).toBe('r1')
  })

  it('does not reach two days away', () => {
    expect(findWriteDuplicate(candidate({ date: '2026-10-24' }), [entry()])).toBeNull()
    expect(findWriteDuplicate(candidate({ date: '2026-10-20' }), [entry()])).toBeNull()
  })

  it('is exact to the toman: 1 toman more or less is a different payment', () => {
    expect(findWriteDuplicate(candidate({ amount: 150_001 }), [entry()])).toBeNull()
    expect(findWriteDuplicate(candidate({ amount: 149_999 }), [entry()])).toBeNull()
  })

  it('ignores another account but not an unnamed one', () => {
    expect(findWriteDuplicate(candidate({ accountId: 'acc-2' }), [entry()])).toBeNull()
    expect(findWriteDuplicate(candidate({ accountId: '' }), [entry()])?.id).toBe('r1')
    expect(findWriteDuplicate(candidate(), [entry({ accountId: '' })])?.id).toBe('r1')
  })

  it('ignores the other direction (the paired leg of a transfer)', () => {
    const leg = entry({ type: 'income', id: 'leg-in' })

    expect(findWriteDuplicate(candidate(), [leg])).toBeNull()
  })

  it('ignores a transfer row made from a bank SMS pair', () => {
    expect(findWriteDuplicate(candidate(), [entry({ note: 'از پیامک' })])).toBeNull()
  })

  it('ignores records already linked (ignore predicate) and records already taken', () => {
    expect(findWriteDuplicate(candidate(), [entry()], { ignore: () => true })).toBeNull()
    expect(findWriteDuplicate(candidate(), [entry()], { excludeIds: new Set(['r1']) })).toBeNull()
  })

  it('wants a similar category or title', () => {
    const other = entry({ category: 'حمل‌ونقل', title: 'تاکسی' })

    expect(findWriteDuplicate(candidate(), [other])).toBeNull()
    // Different category, same title: still the same purchase.
    expect(findWriteDuplicate(candidate(), [entry({ category: 'تفریح' })])?.id).toBe('r1')
    // Title holds the other one.
    expect(
      findWriteDuplicate(candidate({ title: 'قهوه با دوست' }), [entry({ category: 'تفریح' })])?.id
    ).toBe('r1')
  })

  it('reads Persian and Arabic letters and digits as the same', () => {
    const arabic = entry({ title: 'قهوه ۲', category: 'كافه' })

    expect(findWriteDuplicate(candidate({ title: 'قهوه 2', category: 'کافه' }), [arabic])?.id).toBe(
      'r1'
    )
  })

  it('prefers the nearest day, then the same title', () => {
    const near = entry({ id: 'near', date: '2026-10-22' })
    const far = entry({ id: 'far', date: '2026-10-23' })

    expect(findWriteDuplicate(candidate(), [far, near])?.id).toBe('near')
  })

  it('a record an earlier recurring item took is not offered again', () => {
    const rent = entry({ id: 'rent', note: 'تکرار ماهانه', title: 'اجاره', category: 'مسکن' })

    expect(
      findWriteDuplicate(candidate({ title: 'اجاره', category: 'مسکن' }), [rent], {
        excludeIds: new Set(['rent'])
      })
    ).toBeNull()
  })

  it('two coffees: the match is found for the second one, it only warns', () => {
    const first = entry({ id: 'coffee-1', createdAtMs: 1 })
    const found = findWriteDuplicate(candidate(), [first])

    expect(found?.id).toBe('coffee-1')
    // Recording anyway adds a second record; the rule has no state, so the next attempt asks again
    // about the newest of the two and the user answers once per attempt.
    const second = entry({ id: 'coffee-2', createdAtMs: 2 })

    expect(findWriteDuplicate(candidate(), [first, second])?.id).toBe('coffee-2')
  })

  it('does nothing without an amount or a date', () => {
    expect(findWriteDuplicate(candidate({ amount: 0 }), [entry()])).toBeNull()
    expect(findWriteDuplicate(candidate({ date: '' }), [entry()])).toBeNull()
  })
})

describe('recordSourceOf', () => {
  it('reads the note the app writes', () => {
    expect(recordSourceOf({ note: 'ثبت از پیامک' })).toBe('sms')
    expect(recordSourceOf({ note: 'تکرار ماهانه' })).toBe('recurring')
    expect(recordSourceOf({ note: 'تکراری' })).toBe('recurring')
    expect(recordSourceOf({ note: 'چیز دیگر' })).toBe('manual')
    expect(recordSourceLabel({})).toBe('دستی')
  })
})
