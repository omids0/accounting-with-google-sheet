import { afterEach, describe, expect, it } from 'vitest'

import { formatJalaliMonthLabel } from './dateRange'
import { formatDateTimePersian, formatDurationFa, formatJiraTimesheetHours } from './datetime'
import { resetDigitStyleCache, setPersianDigitsEnabled } from './digitStyle'

afterEach(() => {
  setPersianDigitsEnabled(true)
  resetDigitStyleCache()
})

describe('text built from numbers follows the digits setting', () => {
  it('writes the year of a month label in Persian digits', () => {
    expect(formatJalaliMonthLabel('1405-07')).toBe('مهر ۱۴۰۵')
  })

  it('writes timesheet hours and minutes in Persian digits', () => {
    expect(formatJiraTimesheetHours(60)).toBe('۱.۰')
    expect(formatJiraTimesheetHours(0)).toBe('۰')
    expect(formatDurationFa(0)).toBe('۰')
    expect(formatDurationFa(90)).toBe('۱ ساعت و ۳۰ دقیقه')
  })

  it('writes the minutes of a time in Persian digits', () => {
    expect(formatDateTimePersian('2026-10-21T17:38:00')).toMatch(/۱۷:۳۸$/)
    expect(formatDateTimePersian('2026-10-21T09:05:00')).toMatch(/۹:۰۵$/)
  })

  it('keeps Latin digits when the setting is off', () => {
    setPersianDigitsEnabled(false)

    expect(formatJalaliMonthLabel('1405-07')).toBe('مهر 1405')
    expect(formatJiraTimesheetHours(60)).toBe('1.0')
  })
})
