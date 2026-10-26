import { describe, expect, it } from 'vitest'

import { formatIsoDatePersian } from './jalaliDate'
import { formatPaidStamp } from './paidStamp'

describe('formatPaidStamp', () => {
  it('shows an ISO day like every other date', () => {
    expect(formatPaidStamp('2026-10-26')).toBe(formatIsoDatePersian('2026-10-26'))
  })

  it('reads the day of an old Persian locale stamp and drops the time', () => {
    const shown = formatPaidStamp('۱۴۰۵/۷/۲۰، ۱۰:۳۰:۰۰')

    expect(shown).toBe(formatIsoDatePersian('2026-10-12'))
    expect(shown).not.toContain(':')
  })

  it('keeps text it cannot read, and a dash for nothing', () => {
    expect(formatPaidStamp('هفتهٔ پیش')).toBe('هفتهٔ پیش')
    expect(formatPaidStamp('')).toBe('—')
  })
})
