import { describe, expect, it } from 'vitest'

import { recurringStatusLabel } from './RecurringReminderRow'
import type { LedgerEntry } from '../../services/recordDuplicates'

const record: LedgerEntry = {
  type: 'expense',
  amount: 1,
  date: '2026-10-24',
  accountId: '',
  id: 'x'
}

describe('recurringStatusLabel', () => {
  it('says what «ثبت همه» does with the item as it is ticked', () => {
    expect(recurringStatusLabel({ kind: 'new' }, true)).toBe('ثبت می‌شود')
    expect(recurringStatusLabel({ kind: 'new' }, false)).toBe('این ماه رد می‌شود')
    expect(recurringStatusLabel({ kind: 'probable', record }, false)).toBe('احتمال تکراری')
  })

  it('names the day of the record it is already registered as', () => {
    const label = recurringStatusLabel({ kind: 'registered', record }, false)

    expect(label.startsWith('قبلاً ثبت شده (')).toBe(true)
    expect(label).toContain('آبان')
  })
})
