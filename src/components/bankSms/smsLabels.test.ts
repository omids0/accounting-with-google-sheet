import { describe, expect, it } from 'vitest'

import { formatSmsWhen, smsChoiceReason, smsDuplicateLabel } from './smsLabels'

const NOW = new Date(2026, 9, 12, 15, 0).getTime()
const MINUTE = 60_000

describe('formatSmsWhen', () => {
  it('says «امروز» / «دیروز» with the time, else the full date', () => {
    expect(formatSmsWhen(NOW - 30 * MINUTE, NOW)).toMatch(/^امروز /)
    expect(formatSmsWhen(new Date(2026, 9, 11, 23, 0).getTime(), NOW)).toMatch(/^دیروز /)
    expect(formatSmsWhen(new Date(2026, 9, 1, 9, 0).getTime(), NOW)).not.toMatch(/امروز|دیروز/)
  })
})

describe('smsDuplicateLabel', () => {
  it('counts minutes within the hour, then shows the record time', () => {
    expect(smsDuplicateLabel(NOW - 12 * MINUTE, NOW)).toBe('تکراری؟ · رکورد ۱۲ دقیقه پیش')
    expect(smsDuplicateLabel(NOW - 90 * MINUTE, NOW)).toMatch(/^تکراری؟ · رکورد امروز /)
    expect(smsDuplicateLabel(null, NOW)).toBe('تکراری؟ · رکورد مشابه هست')
  })
})

describe('smsChoiceReason', () => {
  it('explains each suggestion source', () => {
    expect(smsChoiceReason({ category: 'حقوق', title: 'حقوق', source: 'recurring' })).toBe(
      'تکرار ماهانه «حقوق» با همین مبلغ'
    )
    expect(smsChoiceReason({ category: 'قبوض', source: 'amount', count: 3 })).toBe(
      'چون ۳ بار قبل همین مبلغ را «قبوض» زدی'
    )
    expect(smsChoiceReason({ category: 'خوراک' })).toBe('انتخاب خودت')
  })
})
