import { describe, expect, it } from 'vitest'

import { buildForecastEvents, type ForecastSources } from './cashForecastEvents'
import type { Check, Dang, InstallmentPlan, PersonalReminder, RecurringItem } from '../types'
import { getJalaliMonthRange } from '../utils/dateRange'
import { addDaysToIso, jalaliToIso } from '../utils/jalaliDate'

const today = jalaliToIso(1405, 8, 6)
const monthEnd = getJalaliMonthRange('1405-08')?.end ?? ''

const empty: ForecastSources = { checks: [], plans: [], dangs: [], recurring: [], reminders: [] }

function check(id: string, dueDate: string, amount: number, direction: Check['direction']): Check {
  return {
    id,
    createdAt: '',
    checkNumber: id,
    direction,
    counterparty: `طرف ${id}`,
    amount,
    creationDate: dueDate,
    dueDate,
    paid: false,
    paidAt: ''
  }
}

function plan(id: string, dueDates: string[], paidCount = 0): InstallmentPlan {
  return {
    id,
    createdAt: '',
    title: `وام ${id}`,
    amount: 2_000_000,
    count: dueDates.length,
    dueDay: 1,
    startDate: dueDates[0],
    note: '',
    payments: dueDates.map((dueDate, index) => ({
      n: index + 1,
      paid: index < paidCount,
      paidAt: '',
      dueDate
    }))
  }
}

function dang(id: string, date: string, amount: number, paid = 0): Dang {
  return {
    id,
    createdAt: '',
    title: `دنگ ${id}`,
    category: '',
    counterparty: '',
    amount,
    date,
    note: '',
    paid: false,
    paidAt: '',
    payments: paid ? [{ id: 'p', amount: paid, paidAt: date, note: '' }] : []
  }
}

function recurring(over: Partial<RecurringItem>): RecurringItem {
  return {
    id: 'r1',
    createdAt: '',
    type: 'expense',
    category: 'اجاره',
    subCategory: '',
    accountId: '',
    amount: 18_000_000,
    title: 'اجاره',
    dayOfMonth: 10,
    mode: 'reminder',
    lastPosted: '',
    active: true,
    ...over
  }
}

function reminder(over: Partial<PersonalReminder>): PersonalReminder {
  return {
    id: 'm1',
    createdAt: '',
    category: 'قبض',
    title: 'قبض برق',
    dueDate: addDaysToIso(today, 3),
    recurrence: 'none',
    amount: 800_000,
    daysBefore: 1,
    enabled: true,
    ...over
  }
}

const build = (sources: Partial<ForecastSources>, endIso = monthEnd) =>
  buildForecastEvents({ ...empty, ...sources }, today, endIso)

describe('buildForecastEvents', () => {
  it('returns nothing without any source', () => {
    expect(build({})).toEqual({ events: [], leftOut: [] })
  })

  it('puts a payable check out and a received check in on their due dates', () => {
    const { events } = build({
      checks: [
        check('pay', addDaysToIso(today, 5), 22_000_000, 'paid'),
        check('get', addDaysToIso(today, 2), 8_000_000, 'received')
      ]
    })

    expect(events.map(item => [item.id, item.amount, item.date])).toEqual([
      ['check_get', 8_000_000, addDaysToIso(today, 2)],
      ['check_pay', -22_000_000, addDaysToIso(today, 5)]
    ])
  })

  it('counts an overdue payable check today and flags it late', () => {
    const { events } = build({ checks: [check('old', addDaysToIso(today, -9), 1_000_000, 'paid')] })

    expect(events).toMatchObject([{ date: today, amount: -1_000_000, late: true }])
  })

  it('does not assume an overdue received check arrives; it is listed as left out', () => {
    const { events, leftOut } = build({
      checks: [check('late', addDaysToIso(today, -4), 5_000_000, 'received')]
    })

    expect(events).toEqual([])
    expect(leftOut).toHaveLength(1)
    expect(leftOut[0]).toMatchObject({ id: 'check_late', amount: 5_000_000 })
  })

  it('skips paid checks and checks past the end', () => {
    const paid = { ...check('paid', addDaysToIso(today, 1), 1_000, 'paid'), paid: true }
    const far = check('far', addDaysToIso(monthEnd, 1), 1_000, 'paid')

    expect(build({ checks: [paid, far] }).events).toEqual([])
  })

  it('counts an installment on the last day of the month and not the first day of the next', () => {
    const nextFirst = addDaysToIso(monthEnd, 1)
    const { events } = build({ plans: [plan('a', [monthEnd, nextFirst])] })

    expect(events.map(item => [item.date, item.amount])).toEqual([[monthEnd, -2_000_000]])
  })

  it('skips paid installment payments', () => {
    const { events } = build({
      plans: [plan('a', [addDaysToIso(today, 1), addDaysToIso(today, 2)], 1)]
    })

    expect(events.map(item => item.id)).toEqual(['installment_a-2'])
  })

  it('takes the remaining part of a part-paid debt, and nothing of a settled one', () => {
    const { events } = build({
      dangs: [
        dang('half', addDaysToIso(today, 4), 1_000_000, 400_000),
        dang('done', addDaysToIso(today, 4), 1_000_000, 1_000_000)
      ]
    })

    expect(events.map(item => [item.id, item.amount])).toEqual([['debt_half', -600_000]])
  })

  it('posts a recurring expense this month and next within a 60-day view (not the third)', () => {
    const endIso = addDaysToIso(today, 60)
    const { events } = build({ recurring: [recurring({ dayOfMonth: 10 })] }, endIso)

    expect(events.map(item => item.date)).toEqual([
      jalaliToIso(1405, 8, 10),
      jalaliToIso(1405, 9, 10)
    ])
  })

  it('skips this month once the recurring item was posted for it', () => {
    const { events } = build({ recurring: [recurring({ lastPosted: '1405-08' })] })

    expect(events).toEqual([])
  })

  it('carries a salary in on its day with the account it lands in', () => {
    const { events } = build({
      recurring: [
        recurring({ type: 'income', dayOfMonth: 20, accountId: 'meli', amount: 65_000_000 })
      ]
    })

    expect(events).toMatchObject([
      { kind: 'recurring', amount: 65_000_000, accountId: 'meli', date: jalaliToIso(1405, 8, 20) }
    ])
  })

  it('does not assume income whose day passed and is not recorded', () => {
    const { events, leftOut } = build({
      recurring: [recurring({ type: 'income', dayOfMonth: 2, amount: 65_000_000 })]
    })

    expect(events).toEqual([])
    expect(leftOut).toHaveLength(1)
  })

  it('counts an unposted recurring expense whose day passed today, as late', () => {
    const { events } = build({ recurring: [recurring({ dayOfMonth: 2 })] })

    expect(events).toMatchObject([{ date: today, late: true, amount: -18_000_000 }])
  })

  it('ignores inactive recurring items', () => {
    expect(build({ recurring: [recurring({ active: false })] }).events).toEqual([])
  })

  it('clamps day 31 to the last day of a 30-day month', () => {
    const { events } = build({ recurring: [recurring({ dayOfMonth: 31 })] })

    expect(events[0].date).toBe(monthEnd)
  })

  it('uses a personal reminder with an amount, once, and a monthly one again next month', () => {
    const once = reminder({ id: 'once' })
    const monthly = reminder({
      id: 'monthly',
      recurrence: 'monthly',
      dueDate: addDaysToIso(today, 10)
    })
    const endIso = addDaysToIso(today, 45)
    const { events } = build({ reminders: [once, monthly] }, endIso)

    expect(events.filter(item => item.id.startsWith('reminder_once'))).toHaveLength(1)
    expect(events.filter(item => item.id.startsWith('reminder_monthly'))).toHaveLength(2)
  })

  it('ignores reminders without an amount or switched off', () => {
    const { events } = build({
      reminders: [reminder({ amount: 0 }), reminder({ id: 'off', enabled: false })]
    })

    expect(events).toEqual([])
  })

  it('counts a late repeating reminder once, not once per missed period', () => {
    const late = reminder({ recurrence: 'monthly', dueDate: addDaysToIso(today, -70) })
    const { events } = build({ reminders: [late] }, addDaysToIso(today, 5))

    expect(events.filter(item => item.late)).toHaveLength(1)
  })

  it('sorts everything by date', () => {
    const { events } = build({
      checks: [check('b', addDaysToIso(today, 9), 1, 'paid')],
      plans: [plan('a', [addDaysToIso(today, 1)])]
    })

    expect(events.map(item => item.date)).toEqual([addDaysToIso(today, 1), addDaysToIso(today, 9)])
  })
})
