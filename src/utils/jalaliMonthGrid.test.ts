import { describe, expect, it } from 'vitest'

import {
  buildJalaliMonthGrid,
  JALALI_WEEKDAYS,
  nextGridDayForKey,
  saturdayFirstColumn
} from './jalaliMonthGrid'

describe('Jalali month grid', () => {
  it('starts the week on Saturday', () => {
    expect(JALALI_WEEKDAYS.map(day => day.short).join(' ')).toBe('ش ی د س چ پ ج')
    expect(saturdayFirstColumn('2026-10-10')).toBe(0) // Saturday
    expect(saturdayFirstColumn('2026-10-16')).toBe(6) // Friday
  })

  it('lays out مهر ۱۴۰۵ (1 مهر = Wednesday 2026-09-23) in padded weeks', () => {
    const weeks = buildJalaliMonthGrid('1405-07')
    const days = weeks.flat().filter(Boolean)

    expect(weeks.every(week => week.length === 7)).toBe(true)
    expect(weeks[0].slice(0, 4)).toEqual([null, null, null, null])
    expect(weeks[0][4]).toBe('2026-09-23')
    expect(days).toHaveLength(30)
    expect(days.at(-1)).toBe('2026-10-22')
  })

  it('returns no weeks for an invalid key', () => {
    expect(buildJalaliMonthGrid('nope')).toEqual([])
  })
})

describe('nextGridDayForKey', () => {
  const day = '2026-10-13' // Tuesday, column 3

  it('moves to the next day with ← in RTL and with → in LTR', () => {
    expect(nextGridDayForKey(day, 'ArrowLeft', true)).toBe('2026-10-14')
    expect(nextGridDayForKey(day, 'ArrowRight', true)).toBe('2026-10-12')
    expect(nextGridDayForKey(day, 'ArrowRight', false)).toBe('2026-10-14')
  })

  it('moves a week with ↑↓ and to the week edges with Home/End', () => {
    expect(nextGridDayForKey(day, 'ArrowUp', true)).toBe('2026-10-06')
    expect(nextGridDayForKey(day, 'ArrowDown', true)).toBe('2026-10-20')
    expect(nextGridDayForKey(day, 'Home', true)).toBe('2026-10-10')
    expect(nextGridDayForKey(day, 'End', true)).toBe('2026-10-16')
  })

  it('moves a Jalali month with PageUp/PageDown and ignores other keys', () => {
    expect(nextGridDayForKey(day, 'PageDown', true)).toBe('2026-11-12') // 21 آبان
    expect(nextGridDayForKey(day, 'PageUp', true)).toBe('2026-09-12') // 21 شهریور
    expect(nextGridDayForKey(day, 'Enter', true)).toBeNull()
  })
})
