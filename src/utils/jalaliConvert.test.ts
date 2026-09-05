import { describe, expect, it } from 'vitest'

import {
  dateToJalali,
  isJalaliLeapYear,
  jalaliMonthLength,
  jalaliToDate,
  jdnToJalali,
  jalaliToJdn
} from './jalaliConvert'

const persianFormatter = new Intl.DateTimeFormat('en-u-ca-persian', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric'
})

/** Ground truth: the ICU Persian calendar, which the app used before. */
function intlJalali(date: Date): { year: number; month: number; day: number } {
  const parts = persianFormatter.formatToParts(date)
  const get = (type: string) => Number(parts.find(part => part.type === type)?.value ?? 0)

  return { year: get('year'), month: get('month'), day: get('day') }
}

describe('jalaliConvert', () => {
  it('matches Intl for every day across 1990-2060', () => {
    const cursor = new Date(1990, 0, 1, 12, 0, 0, 0)
    const end = new Date(2060, 11, 31, 12, 0, 0, 0)

    let checked = 0

    while (cursor <= end) {
      const expected = intlJalali(cursor)
      const actual = dateToJalali(cursor)

      if (
        actual.year !== expected.year ||
        actual.month !== expected.month ||
        actual.day !== expected.day
      ) {
        throw new Error(
          `Mismatch on ${cursor.toDateString()}: got ${actual.year}/${actual.month}/${
            actual.day
          }, expected ${expected.year}/${expected.month}/${expected.day}`
        )
      }

      checked++
      cursor.setDate(cursor.getDate() + 1)
    }

    expect(checked).toBeGreaterThan(25_000)
  })

  it('round-trips Jalali -> Date -> Jalali for every day of 1380-1450', () => {
    for (let jy = 1380; jy <= 1450; jy++) {
      for (let jm = 1; jm <= 12; jm++) {
        const length = jalaliMonthLength(jy, jm)

        for (let jd = 1; jd <= length; jd++) {
          const back = dateToJalali(jalaliToDate(jy, jm, jd))

          expect(`${back.year}/${back.month}/${back.day}`).toBe(`${jy}/${jm}/${jd}`)
        }
      }
    }
  })

  it('round-trips Julian Day Numbers', () => {
    for (let jdn = 2_400_000; jdn < 2_500_000; jdn += 37) {
      const { year, month, day } = jdnToJalali(jdn)

      expect(jalaliToJdn(year, month, day)).toBe(jdn)
    }
  })

  it('reports Esfand length from the leap year rule', () => {
    for (let jy = 1380; jy <= 1450; jy++) {
      const expected = isJalaliLeapYear(jy) ? 30 : 29

      expect(jalaliMonthLength(jy, 12)).toBe(expected)

      // Cross-check against Intl: day 30 of Esfand only exists in leap years.
      const candidate = jalaliToDate(jy, 12, 30)
      const parts = intlJalali(candidate)
      const isRealEsfand30 = parts.month === 12 && parts.day === 30

      expect(isRealEsfand30).toBe(expected === 30)
    }
  })

  it('knows the fixed month lengths', () => {
    for (let jm = 1; jm <= 6; jm++) expect(jalaliMonthLength(1403, jm)).toBe(31)
    for (let jm = 7; jm <= 11; jm++) expect(jalaliMonthLength(1403, jm)).toBe(30)
  })
})
