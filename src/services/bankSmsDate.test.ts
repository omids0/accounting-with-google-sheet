import { describe, expect, it } from 'vitest'

import { smsRecordDate } from './bankSmsDate'
import { jalaliToIso } from '../utils/jalaliDate'

// 1405/07/16, noon local time.
const RECEIVED = new Date(`${jalaliToIso(1405, 7, 16)}T12:00:00`).getTime()

describe('smsRecordDate', () => {
  it('uses the Jalali date printed in the SMS', () => {
    expect(smsRecordDate('برداشت 1,000 مانده 5,000 1405/07/14 10:20', RECEIVED)).toBe(
      jalaliToIso(1405, 7, 14)
    )
  })

  it('reads two-digit years and Persian digits', () => {
    expect(smsRecordDate('خرید ۲۰۰ ۰۵/۰۷/۱۵_۱۸:۴۰', RECEIVED)).toBe(jalaliToIso(1405, 7, 15))
  })

  it('falls back to the arrival day without a date or with an implausible one', () => {
    const arrival = jalaliToIso(1405, 7, 16)

    expect(smsRecordDate('برداشت 1,000 مانده 5,000', RECEIVED)).toBe(arrival)
    expect(smsRecordDate('برداشت 1,000 1404/01/01', RECEIVED)).toBe(arrival)
    expect(smsRecordDate('برداشت 1,000 1405/13/40', RECEIVED)).toBe(arrival)
  })
})
