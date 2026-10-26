import { describe, expect, it } from 'vitest'

import { dangToManager, monthFlowOf } from './buildingDashboard'
import { buildingUpcoming, nextIssueDate } from './buildingUpcoming'
import type { Dang, RecordRow, RecurringItem } from '../types'
import { findGregorianForJalali, toIsoDate } from '../utils/jalaliDate'

const range = { start: '2026-10-01', end: '2026-10-31' }

const record = (amount: number, date: string, category = 'سایر'): RecordRow => ({
  id: `${amount}${date}${category}`,
  createdAt: '',
  values: { amount: String(amount), date, category }
})

describe('monthFlowOf', () => {
  it('sums this month, counts the spending and skips other months', () => {
    const flow = monthFlowOf(
      { records: [record(10_000_000, '2026-10-05'), record(5, '2026-09-30')] },
      { records: [record(4_000_000, '2026-10-06'), record(900_000, '2026-10-09')] },
      range
    )

    expect(flow).toEqual({ income: 10_000_000, expense: 4_900_000, expenseCount: 2 })
  })

  it('leaves out transfers and fund corrections', () => {
    const flow = monthFlowOf(
      { records: [record(1_000_000, '2026-10-05'), record(300_000, '2026-10-05', 'اصلاح موجودی')] },
      { records: [record(2_000_000, '2026-10-05', 'انتقال'), record(7, '2026-10-05', 'آسانسور')] },
      range
    )

    expect(flow).toEqual({ income: 1_000_000, expense: 7, expenseCount: 1 })
  })
})

describe('dangToManager', () => {
  const dang = (counterparty: string, amount: number, paid = false): Dang => ({
    id: counterparty + amount,
    createdAt: '',
    title: '',
    category: '',
    counterparty,
    amount,
    date: '2026-10-01',
    note: '',
    paid,
    paidAt: '',
    payments: []
  })

  it('adds up the unpaid dang owed to the payer «مدیر» or to a person flagged as the manager', () => {
    const dangs = [
      dang('مدیر', 2_400_000),
      dang('علی رضایی', 100_000),
      dang('مدیر', 500_000, true),
      dang('پیمانکار', 9)
    ]

    expect(dangToManager(dangs, ['مدیر', 'علی رضایی'])).toBe(2_500_000)
    expect(dangToManager(dangs, [''])).toBe(0)
  })
})

describe('building upcoming', () => {
  const today = toIsoDate(findGregorianForJalali(1405, 8, 5))

  const day = (d: number, m = 8) => toIsoDate(findGregorianForJalali(1405, m, d))

  it('the next issue is this month when its day is ahead, else next month', () => {
    expect(nextIssueDate(10, today)).toBe(day(10))
    expect(nextIssueDate(5, today)).toBe(day(5))
    expect(nextIssueDate(1, today)).toBe(day(1, 9))
  })

  const profile = {
    issueDay: 10,
    defaultCharge: 1_200_000,
    chargeMethod: 'fixed' as const,
    vacancyRule: 'half' as const
  }

  const units = [
    { area: 100, people: 2, monthlyCharge: 0, occupancy: 'owner-resident' as const, active: true },
    { area: 100, people: 2, monthlyCharge: 0, occupancy: 'vacant' as const, active: true },
    { area: 100, people: 2, monthlyCharge: 0, occupancy: 'owner-resident' as const, active: false }
  ] as Parameters<typeof buildingUpcoming>[0]['units']

  const repeat = (dayOfMonth: number, active = true): RecurringItem => ({
    id: `r${dayOfMonth}`,
    createdAt: '',
    type: 'expense',
    category: 'نظافت',
    subCategory: '',
    accountId: '',
    amount: 1_500_000,
    title: 'نظافت ماهانه',
    dayOfMonth,
    mode: 'reminder',
    lastPosted: '',
    active
  })

  it('lists the issue with what it bills, active recurring items and the due checks', () => {
    const items = buildingUpcoming({
      profile,
      units,
      recurring: [repeat(20), repeat(3), repeat(9, false)],
      checks: [
        {
          type: 'check',
          id: 'c1',
          title: 'پیمانکار آسانسور',
          amount: 6_000_000,
          dueDate: day(20),
          status: 'upcoming',
          subtitle: 'چک'
        }
      ],
      todayIso: today
    })

    const issue = items.find(item => item.id.startsWith('building_issue'))

    // One unit pays in full, the vacant one half; the archived unit does not count.
    expect(issue).toMatchObject({ dueDate: day(10), amount: 1_800_000, title: 'صدور شارژ آبان' })

    const dates = Object.fromEntries(items.map(item => [item.id, item.dueDate]))

    expect(dates.building_recurring_r20).toBe(day(20))
    // A day already past moves to next month; an inactive item is not listed.
    expect(dates.building_recurring_r3).toBe(day(3, 9))
    expect(dates.building_recurring_r9).toBeUndefined()
    expect(items.find(item => item.kind === 'checks')?.title).toBe('پیمانکار آسانسور')
  })
})
