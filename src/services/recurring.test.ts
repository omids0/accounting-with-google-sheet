import { describe, expect, it } from 'vitest'

import {
  dueAutoItems,
  findRecurringForRecord,
  findRecurringMatch,
  isRecurringBorn,
  normalizeMonthKey,
  pendingReminders,
  planAutoPost,
  planReminderPost,
  recurringDueDate,
  recurringFromRecord,
  recurringRecordValues,
  recurringToRow,
  reminderPostDate,
  rowToRecurring
} from './recurring'
import { recurringDigestLine } from './recurringDigest'
import type { RecurringItem } from '../types'
import { jalaliToIso } from '../utils/jalaliDate'

function item(overrides: Partial<RecurringItem> = {}): RecurringItem {
  return {
    id: 'r1',
    createdAt: '',
    type: 'expense',
    category: 'مسکن',
    subCategory: 'اجاره',
    accountId: 'mellat',
    amount: 12_000_000,
    title: 'اجاره',
    dayOfMonth: 5,
    mode: 'reminder',
    lastPosted: '1405-06',
    active: true,
    ...overrides
  }
}

// ۱۴۰۵/۰۷/۰۱ … ۱۴۰۵/۰۷/۰۵ (مهر)
const MEHR_1 = jalaliToIso(1405, 7, 1)
const MEHR_4 = jalaliToIso(1405, 7, 4)
const MEHR_5 = jalaliToIso(1405, 7, 5)

describe('row codec', () => {
  it('round-trips and normalizes «آخرین ثبت»', () => {
    expect(rowToRecurring(recurringToRow(item()))).toEqual(item())
    expect(normalizeMonthKey('۱۴۰۵-۷')).toBe('1405-07')
    expect(rowToRecurring([...recurringToRow(item()).slice(0, 11), 'خیر'])?.active).toBe(false)
    expect(rowToRecurring(['', '', 'expense', 'x', '', '', '10'])).toBeNull()
  })
})

describe('building columns', () => {
  const building = item({ expenseKind: 'current', payer: 'manager', accountId: '' })

  it('round-trips the kind and payer and leaves a personal row without the two cells', () => {
    expect(rowToRecurring(recurringToRow(building))).toEqual(building)
    expect(recurringToRow(item())).toHaveLength(12)
    expect(recurringToRow(building).slice(12)).toEqual(['current', 'manager'])
  })

  it('carries them from a saved record into the item and from the item into the posted record', () => {
    const created = recurringFromRecord(
      'expense',
      {
        category: 'نظافت',
        title: 'نظافت',
        amount: 1_400_000,
        expenseKind: 'current',
        payer: 'manager'
      },
      MEHR_5,
      'reminder',
      { id: 'n', createdAt: '' }
    )

    expect(created).toMatchObject({ expenseKind: 'current', payer: 'manager' })
    expect(recurringRecordValues(created, 'date', MEHR_5, 'تکراری')).toMatchObject({
      expenseKind: 'current',
      payer: 'manager'
    })
    expect(recurringRecordValues(item(), 'date', MEHR_5, 'x')).not.toHaveProperty('payer')
  })
})

describe('day-of-month clamping', () => {
  it('moves 29/30/31 to the last day of shorter Jalali months', () => {
    expect(recurringDueDate({ dayOfMonth: 31 }, '1405-01')).toBe(jalaliToIso(1405, 1, 31))
    expect(recurringDueDate({ dayOfMonth: 31 }, '1405-07')).toBe(jalaliToIso(1405, 7, 30))
    expect(recurringDueDate({ dayOfMonth: 30 }, '1405-12')).toBe(jalaliToIso(1405, 12, 29))
    expect(recurringDueDate({ dayOfMonth: 29 }, '1405-12')).toBe(jalaliToIso(1405, 12, 29))
  })
})

describe('month window', () => {
  it('shows reminder items from the 1st until they are handled this month', () => {
    const items = [
      item(),
      item({ id: 'done', lastPosted: '1405-07' }),
      item({ id: 'auto', mode: 'auto' }),
      item({ id: 'off', active: false })
    ]

    expect(pendingReminders(items, MEHR_1).map(entry => entry.id)).toEqual(['r1'])
    expect(pendingReminders(items, jalaliToIso(1405, 8, 1)).map(entry => entry.id)).toEqual([
      'r1',
      'done'
    ])
  })

  it('posts auto items only on or after their day', () => {
    const auto = item({ mode: 'auto' })

    expect(dueAutoItems([auto], MEHR_4)).toEqual([])
    expect(dueAutoItems([auto], MEHR_5)).toEqual([auto])
    expect(dueAutoItems([{ ...auto, lastPosted: '1405-07' }], MEHR_5)).toEqual([])
  })

  it('dates an early reminder post today and a late one on its day', () => {
    expect(reminderPostDate(item(), MEHR_1)).toBe(MEHR_1)
    expect(reminderPostDate(item({ dayOfMonth: 2 }), MEHR_5)).toBe(jalaliToIso(1405, 7, 2))
  })
})

describe('skip', () => {
  it('posts ticked items and skips the rest for this month', () => {
    const items = [item(), item({ id: 'r2' }), item({ id: 'r3' })]
    const plan = planReminderPost(items, new Set(['r1', 'r3']))

    expect(plan.post.map(entry => entry.id)).toEqual(['r1', 'r3'])
    expect(plan.skip.map(entry => entry.id)).toEqual(['r2'])
  })
})

describe('double-post guard and undo', () => {
  const auto = item({ mode: 'auto' })

  it('posts when the remote row still matches this device', () => {
    expect(planAutoPost(auto, { ...auto }, '1405-07')).toBe('post')
  })

  it('never posts twice for the same month', () => {
    expect(planAutoPost(auto, { ...auto, lastPosted: '1405-07' }, '1405-07')).toBe('skip')
  })

  it('aborts when the row changed elsewhere or is gone', () => {
    expect(planAutoPost(auto, { ...auto, amount: 1 }, '1405-07')).toBe('conflict')
    expect(planAutoPost(auto, null, '1405-07')).toBe('conflict')
  })

  it('makes the item due again once undo restores «آخرین ثبت»', () => {
    const posted = { ...auto, lastPosted: '1405-07' }

    expect(dueAutoItems([posted], MEHR_5)).toEqual([])
    expect(dueAutoItems([{ ...posted, lastPosted: auto.lastPosted }], MEHR_5)).toHaveLength(1)
  })
})

describe('lookups', () => {
  it('findRecurringMatch: same amount and account, active only', () => {
    const items = [item({ id: 'off', active: false }), item({ id: 'on' })]

    expect(findRecurringMatch(12_000_000, 'mellat', items)?.id).toBe('on')
    expect(findRecurringMatch(12_000_000, 'cash', items)).toBeNull()
  })

  it('links a record to its item and tells recurring-born records apart', () => {
    const values = {
      category: 'مسکن',
      subCategory: 'اجاره',
      walletAccount: 'mellat',
      title: 'اجاره',
      amount: 9,
      note: 'تکرار ماهانه'
    }

    expect(findRecurringForRecord([item()], 'expense', values)?.id).toBe('r1')
    expect(findRecurringForRecord([item()], 'income', values)).toBeNull()
    expect(isRecurringBorn(values)).toBe(true)
    expect(isRecurringBorn({ note: 'تکراری' })).toBe(true)
    expect(isRecurringBorn({ note: '' })).toBe(false)
  })

  it('builds an item from a saved record with its month handled', () => {
    const created = recurringFromRecord(
      'expense',
      { category: 'قبوض', amount: '350000', title: 'اینترنت' },
      MEHR_5,
      'reminder',
      { id: 'n', createdAt: '' }
    )

    expect(created).toMatchObject({ dayOfMonth: 5, lastPosted: '1405-07', amount: 350_000 })
  })
})

describe('digest line', () => {
  it('joins the digest on one day per month only', () => {
    const first = recurringDigestLine(2, undefined, MEHR_1)

    expect(first.line).toBe('۲ تکرار ثبت‌نشده')
    expect(recurringDigestLine(2, first.gate, MEHR_1).line).toBe('۲ تکرار ثبت‌نشده')
    expect(recurringDigestLine(2, first.gate, MEHR_4).line).toBeNull()
    expect(recurringDigestLine(0, undefined, MEHR_1).line).toBeNull()
    expect(recurringDigestLine(1, first.gate, jalaliToIso(1405, 8, 1)).line).not.toBeNull()
  })
})
