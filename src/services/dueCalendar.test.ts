import { describe, expect, it } from 'vitest'

import type { DashboardReminderItem } from './dashboardReminders'
import {
  bucketDueItemsByDay,
  buildDueDatesIcs,
  dueCalendarHorizonEnd,
  dueItemIcsSummary,
  dueItemsInMonth,
  isDueItemOverdue,
  summarizeDueDays
} from './dueCalendar'

const TODAY = '2026-10-13'

function item(overrides: Partial<DashboardReminderItem>): DashboardReminderItem {
  return {
    id: 'installments_p1-1',
    kind: 'installments',
    kindLabel: 'اقساط',
    title: 'وام مسکن',
    subtitle: 'قسط ۱',
    dueDate: TODAY,
    amount: 3_000_000,
    status: 'today',
    ...overrides
  }
}

const fixture: DashboardReminderItem[] = [
  item({ id: 'installments_car-4', title: 'خودرو', dueDate: '2026-10-04', status: 'overdue' }),
  item({ id: 'installments_home-7', dueDate: '2026-10-27', status: 'upcoming' }),
  item({
    id: 'checks_c9',
    kind: 'checks',
    kindLabel: 'چک‌ها',
    title: 'علی رضایی, شرکت; نو',
    subtitle: 'شماره 123452',
    dueDate: '2026-10-27',
    amount: 2_000_000,
    status: 'upcoming'
  }),
  item({
    id: 'personal_r1',
    kind: 'personal',
    kindLabel: 'مواعد شخصی',
    title: 'تمدید بیمه',
    subtitle: 'سایر',
    dueDate: '2027-09-30',
    amount: 0,
    status: 'upcoming'
  }),
  item({ id: 'dang_far', kind: 'dang', title: 'قرض', dueDate: '2028-01-01', status: 'upcoming' })
]

describe('isDueItemOverdue', () => {
  it('is overdue when flagged or when the date is behind today', () => {
    expect(isDueItemOverdue({ dueDate: '2026-10-12', status: 'upcoming' }, TODAY)).toBe(true)
    expect(isDueItemOverdue({ dueDate: TODAY, status: 'overdue' }, TODAY)).toBe(true)
    expect(isDueItemOverdue({ dueDate: TODAY, status: 'today' }, TODAY)).toBe(false)
    expect(isDueItemOverdue({ dueDate: '2026-10-20', status: 'upcoming' }, TODAY)).toBe(false)
  })
})

describe('day bucketing', () => {
  it('groups items by their due day, keeping the input order', () => {
    const buckets = bucketDueItemsByDay([
      ...fixture,
      item({ id: 'x', dueDate: '2026-10-27T09:00:00' })
    ])

    expect(buckets.get('2026-10-27')?.map(entry => entry.id)).toEqual([
      'installments_home-7',
      'checks_c9',
      'x'
    ])
    expect(buckets.get('2026-10-04')).toHaveLength(1)
    expect(buckets.has('2026-10-13')).toBe(false)
  })

  it('summarizes the count and the overdue flag per day', () => {
    const summaries = summarizeDueDays(fixture, TODAY)

    expect(summaries.get('2026-10-04')).toEqual({ count: 1, overdue: true })
    expect(summaries.get('2026-10-27')).toEqual({ count: 2, overdue: false })
  })

  it('lists the items of one Jalali month by date', () => {
    // مهر ۱۴۰۵ = 2026-09-23 … 2026-10-22
    expect(dueItemsInMonth(fixture, '1405-07').map(entry => entry.id)).toEqual([
      'installments_car-4'
    ])
    expect(dueItemsInMonth(fixture, '1405-08').map(entry => entry.id)).toEqual([
      'installments_home-7',
      'checks_c9'
    ])
    expect(dueItemsInMonth(fixture, 'bad')).toEqual([])
  })
})

describe('ICS export', () => {
  const now = new Date('2026-10-13T05:00:00Z')
  const { content, count } = buildDueDatesIcs(fixture, { todayIso: TODAY, now })
  const text = content.replace(/\r\n /g, '')

  it('covers today through twelve Jalali months ahead, overdue and later items left out', () => {
    expect(dueCalendarHorizonEnd(TODAY)).toBe('2027-10-13')
    expect(count).toBe(3)
    expect(text).not.toContain('installments_car-4')
    expect(text).not.toContain('dang_far')
    expect(text).toContain('DTSTART;VALUE=DATE:20270930')
  })

  it('names events in Persian with the kind and amount', () => {
    expect(dueItemIcsSummary(fixture[1])).toBe('قسط وام مسکن · ۳٬۰۰۰٬۰۰۰')
    expect(dueItemIcsSummary(item({ title: 'قسط خودرو', amount: 0 }))).toBe('قسط خودرو')
    expect(dueItemIcsSummary(fixture[3])).toBe('تمدید بیمه')
    expect(text).toContain('SUMMARY:قسط وام مسکن · ۳٬۰۰۰٬۰۰۰\r\n')
  })

  it('escapes commas and semicolons in summaries', () => {
    expect(text).toContain('SUMMARY:چک علی رضایی\\, شرکت\\; نو · ۲٬۰۰۰٬۰۰۰\r\n')
  })

  it('uses stable UIDs from item ids, so a re-import updates the same events', () => {
    const again = buildDueDatesIcs(fixture, {
      todayIso: TODAY,
      now: new Date('2026-11-01T00:00:00Z')
    }).content
    const uids = (source: string) => source.split('\r\n').filter(line => line.startsWith('UID:'))

    // Same day: ordered by id, so the file is identical for identical data.
    expect(uids(content)).toEqual([
      'UID:checks_c9@personal-accounting-pwa',
      'UID:installments_home-7@personal-accounting-pwa',
      'UID:personal_r1@personal-accounting-pwa'
    ])
    expect(uids(again)).toEqual(uids(content))
  })

  it('stamps every event in UTC and sets an alarm one day before', () => {
    expect(text.match(/DTSTAMP:20261013T050000Z\r\n/g)).toHaveLength(3)
    expect(text.match(/TRIGGER:-P1D\r\n/g)).toHaveLength(3)
  })
})
