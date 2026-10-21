import { describe, expect, it } from 'vitest'

import { chargeSummary } from './chargeSummary'

const base = {
  defaultCharge: 2000000,
  chargeMethod: 'fixed' as const,
  issueDay: 1,
  dueDay: 10,
  vacancyRule: 'full' as const
}

describe('chargeSummary', () => {
  it('speaks plainly about a fixed monthly charge', () => {
    const text = chargeSummary(base)

    expect(text).toContain('شارژ ماهانه')
    expect(text).toContain('۲٬۰۰۰٬۰۰۰')
    expect(text).toContain('برای هر واحد · صدور روز ۱ · سررسید روز ۱۰')
    expect(text).not.toContain('پیش‌فرض')
  })

  it('names the method and the vacancy rule only when they are not the defaults', () => {
    const text = chargeSummary({ ...base, chargeMethod: 'area', vacancyRule: 'half' })

    expect(text).toContain('بر اساس متراژ')
    expect(text).toContain('واحد خالی: نصف شارژ')
  })
})
