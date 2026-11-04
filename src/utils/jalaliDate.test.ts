import { describe, expect, it } from 'vitest'

import { formatCalendarDate, formatCalendarDateCompact } from './dateConverter'
import {
  addJalaliMonths,
  formatIsoDatePersian,
  isoToJalali,
  isRealIsoDate,
  toIsoDate
} from './jalaliDate'

const IMPOSSIBLE = ['2026-10-32', '2026-13-01', '2026-00-10', '2026-10-00', '9999-99-99']

describe('impossible dates from a sheet row never throw', () => {
  it('recognises real and impossible calendar dates', () => {
    expect(isRealIsoDate('2026-10-31')).toBe(true)
    expect(isRealIsoDate('2026-02-28')).toBe(true)

    for (const bad of IMPOSSIBLE) expect(isRealIsoDate(bad), bad).toBe(false)
    expect(isRealIsoDate('2026-1-5')).toBe(false)
    expect(isRealIsoDate('')).toBe(false)
  })

  it('formatIsoDatePersian returns the raw text instead of a RangeError', () => {
    for (const bad of IMPOSSIBLE) {
      expect(() => formatIsoDatePersian(bad), bad).not.toThrow()
      expect(formatIsoDatePersian(bad)).toBe(bad)
    }
    expect(formatIsoDatePersian('')).toBe('—')
    expect(formatIsoDatePersian('2026-10-31')).not.toBe('2026-10-31')
  })

  it('the Jalali helpers fall back to today, with real numbers', () => {
    for (const bad of IMPOSSIBLE) {
      const parts = isoToJalali(bad)

      expect(Number.isFinite(parts.year), bad).toBe(true)
      expect(parts.month).toBeGreaterThanOrEqual(1)
      expect(parts.day).toBeGreaterThanOrEqual(1)
      expect(() => addJalaliMonths(bad, 1, 5)).not.toThrow()
      expect(addJalaliMonths(bad, 1, 5)).not.toContain('NaN')
    }
    expect(isoToJalali(toIsoDate(new Date()))).toEqual(isoToJalali(''))
  })

  it('the calendar formatters show a dash for a date that does not exist', () => {
    for (const bad of IMPOSSIBLE) {
      expect(() => formatCalendarDate(bad, 'shamsi'), bad).not.toThrow()
      expect(formatCalendarDate(bad, 'shamsi')).toBe('—')
      expect(formatCalendarDateCompact(bad, 'miladi')).toBe('—')
    }
  })
})
