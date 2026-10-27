import { describe, expect, it } from 'vitest'

import { jalaliToIso } from './jalaliDate'
import { asOfEndLabel, describePeriod, formatDayBadge } from './periodLabel'

const today = jalaliToIso(1405, 7, 20)

describe('describePeriod', () => {
  it('names month-to-date and a whole past month by the month', () => {
    expect(describePeriod({ start: jalaliToIso(1405, 7, 1), end: today }, today)).toEqual({
      kind: 'month',
      label: 'مهر ۱۴۰۵',
      noun: 'ماه'
    })
    expect(
      describePeriod({ start: jalaliToIso(1405, 6, 1), end: jalaliToIso(1405, 6, 31) }, today)
    ).toMatchObject({ kind: 'month', label: 'شهریور ۱۴۰۵' })
  })

  it('names year-to-date by the year', () => {
    expect(describePeriod({ start: jalaliToIso(1405, 1, 1), end: today }, today)).toMatchObject({
      kind: 'year',
      label: '۱۴۰۵',
      noun: 'سال'
    })
  })

  it('falls back to the range for anything else', () => {
    const period = describePeriod(
      { start: jalaliToIso(1405, 7, 3), end: jalaliToIso(1405, 7, 10) },
      today
    )

    expect(period.kind).toBe('range')
    expect(period.noun).toBe('دوره')
  })
})

describe('formatDayBadge', () => {
  it('splits a date into Persian day and month name', () => {
    expect(formatDayBadge(jalaliToIso(1405, 7, 15))).toEqual({ day: '۱۵', month: 'مهر' })
  })
})

describe('asOfEndLabel', () => {
  it('says «تا پایان …» for a month end and the day for any other day', () => {
    expect(asOfEndLabel(jalaliToIso(1405, 7, 30))).toBe('تا پایان مهر ۱۴۰۵')
    expect(asOfEndLabel(jalaliToIso(1405, 12, 29))).toMatch(/^تا پایان اسفند ۱۴۰۵$/)
    expect(asOfEndLabel(jalaliToIso(1405, 7, 15))).toMatch(/^تا .*۱۵.*مهر.*۱۴۰۵/)
  })

  it('is empty without a day', () => {
    expect(asOfEndLabel(undefined)).toBeUndefined()
    expect(asOfEndLabel('')).toBeUndefined()
  })
})
