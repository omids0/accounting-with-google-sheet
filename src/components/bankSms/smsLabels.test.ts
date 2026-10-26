import { describe, expect, it } from 'vitest'

import {
  formatSmsWhen,
  smsChoiceReason,
  smsDuplicateLabel,
  smsDuplicateStatus,
  smsPaymentLabel,
  smsSplitBadge,
  smsSplitLine
} from './smsLabels'

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

describe('smsPaymentLabel', () => {
  it('says a debt was paid and a receivable collected, with the record age', () => {
    expect(smsPaymentLabel({ noun: 'بدهی', title: 'وام' }, NOW - 12 * MINUTE, NOW)).toBe(
      'پرداخت بدهی «وام» ثبت شده · ۱۲ دقیقه پیش'
    )
    expect(
      smsPaymentLabel({ noun: 'طلب', title: 'علی', income: true }, NOW - 90 * MINUTE, NOW)
    ).toMatch(/^دریافت طلب «علی» ثبت شده · امروز /)
    expect(smsPaymentLabel({ noun: 'بدهی', title: 'وام' }, null, NOW)).toBe(
      'پرداخت بدهی «وام» ثبت شده'
    )
  })

  it('clips a long title', () => {
    const label = smsPaymentLabel({ noun: 'بدهی', title: 'ب'.repeat(40) }, null, NOW)

    expect(label).toBe(`پرداخت بدهی «${'ب'.repeat(18)}…» ثبت شده`)
  })
})

describe('smsSplitBadge and smsSplitLine', () => {
  const payment = { kind: 'dang', noun: 'بدهی', title: 'وام' }

  it('asks «بخشی از پرداخت؟» with the record and uncovered amounts', () => {
    expect(smsSplitBadge(payment, false)).toBe('بخشی از پرداخت «وام»؟')
    expect(smsSplitBadge(payment, true)).toBe('بخشی از دریافت «وام»؟')
    expect(
      smsSplitLine({
        duplicateOf: { amount: 20_000_000, type: 'expense' },
        duplicatePayment: payment,
        splitUncovered: 20_000_000
      })
    ).toBe('بخشی از پرداخت «وام» (۲۰٬۰۰۰٬۰۰۰، پوشش‌نیافته ۲۰٬۰۰۰٬۰۰۰)؟')
    expect(
      smsSplitLine({ duplicateOf: null, duplicatePayment: payment, splitUncovered: null })
    ).toBe('')
  })

  it('is the status of a split item', () => {
    const item = {
      duplicateOf: { amount: 5, type: 'income', createdAtMs: NOW },
      duplicatePayment: payment,
      splitUncovered: 5
    }

    expect(smsDuplicateStatus(item as never, NOW)).toBe('بخشی از دریافت «وام»؟')
  })
})

describe('smsDuplicateStatus', () => {
  it('shows the payment when the record is one, else the «تکراری؟» label', () => {
    const duplicateOf = { createdAtMs: NOW - 12 * MINUTE }
    const payment = { kind: 'dang', noun: 'بدهی', title: 'وام' }

    expect(
      smsDuplicateStatus(
        { duplicateOf, duplicatePayment: null, splitUncovered: null } as never,
        NOW
      )
    ).toBe('تکراری؟ · رکورد ۱۲ دقیقه پیش')
    expect(
      smsDuplicateStatus(
        { duplicateOf, duplicatePayment: payment, splitUncovered: null } as never,
        NOW
      )
    ).toBe('پرداخت بدهی «وام» ثبت شده · ۱۲ دقیقه پیش')
    expect(
      smsDuplicateStatus(
        {
          duplicateOf: { ...duplicateOf, type: 'income' },
          duplicatePayment: payment,
          splitUncovered: null
        } as never,
        NOW
      )
    ).toMatch(/^دریافت /)
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
