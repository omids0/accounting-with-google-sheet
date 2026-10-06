import { describe, expect, it } from 'vitest'

import { daysInCalendarMonth, getCalendarParts, partsToIso } from './dateConverter'
import { jalaliToIso } from './jalaliDate'
import { normalizeSheetDate } from './sheetValues'

describe('normalizeSheetDate', () => {
  it('keeps reading Jalali YYYY/MM/DD as before', () => {
    expect(normalizeSheetDate('1403/01/01')).toBe(jalaliToIso(1403, 1, 1))
    expect(normalizeSheetDate('۱۴۰۲/۱۲/۲۹')).toBe(jalaliToIso(1402, 12, 29))
    expect(normalizeSheetDate('1399-7-5')).toBe(jalaliToIso(1399, 7, 5))
  })

  it('treats years from 1900 on as Gregorian', () => {
    expect(normalizeSheetDate('2024/03/15')).toBe('2024-03-15')
    expect(normalizeSheetDate('2024/3/5')).toBe('2024-03-05')
    expect(normalizeSheetDate('۲۰۲۴/۰۳/۲۰')).toBe('2024-03-20')
    expect(normalizeSheetDate('1999-12-31')).toBe('1999-12-31')
  })

  it('rejects impossible Gregorian days instead of rolling them over', () => {
    expect(normalizeSheetDate('2023/02/29')).toBe('')
    expect(normalizeSheetDate('2024/02/29')).toBe('2024-02-29')
  })

  it('leaves ISO strings and sheet serials alone', () => {
    expect(normalizeSheetDate('2024-03-15T10:00:00Z')).toBe('2024-03-15')
    expect(normalizeSheetDate(45366)).toBe('2024-03-15')
    expect(normalizeSheetDate('')).toBe('')
  })
})

describe('Hijri conversion', () => {
  it('round-trips a valid Hijri date', () => {
    const iso = partsToIso({ year: 1446, month: 1, day: 1 }, 'hijri')

    expect(iso).not.toBeNull()
    expect(getCalendarParts(iso!, 'hijri')).toEqual({ year: 1446, month: 1, day: 1 })
  })

  it('returns null for a day that does not exist instead of today', () => {
    expect(partsToIso({ year: 1446, month: 1, day: 31 }, 'hijri')).toBeNull()
    expect(partsToIso({ year: 1446, month: 13, day: 1 }, 'hijri')).toBeNull()

    const days = daysInCalendarMonth(1446, 2, 'hijri')

    expect([29, 30]).toContain(days)

    if (days === 29) {
      expect(partsToIso({ year: 1446, month: 2, day: 30 }, 'hijri')).toBeNull()
    }
  })
})
