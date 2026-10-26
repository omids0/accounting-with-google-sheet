import { describe, expect, it, vi } from 'vitest'

import { searchEntries } from './globalSearch'
import { buildSearchEntries, type SearchSources } from './globalSearchEntries'
import { getUpcomingDueDateReminders } from './reminderDueDates'
import { collectDangDueItems } from './reports'
import type { Dang, DangPayment, ReminderRule } from '../types'

vi.mock('./sheetSync', () => ({ enqueueSheetWrite: vi.fn(), queueOutboxWrite: vi.fn() }))

const payment = (id: string, amount: number): DangPayment => ({
  id,
  amount,
  paidAt: '2026-10-05',
  note: ''
})

const dang = (overrides: Partial<Dang> = {}): Dang => ({
  id: 'd1',
  createdAt: '',
  title: 'خرید لامپ',
  category: 'خانه',
  counterparty: 'رضا',
  amount: 100_000,
  date: '2026-10-20',
  note: '',
  paid: false,
  paidAt: '',
  payments: [],
  ...overrides
})

const partial = dang({ payments: [payment('p1', 30_000)] })

const settled = dang({ id: 'd2', paid: true, payments: [payment('p2', 100_000)] })

describe('the due-date list', () => {
  it('lists a partly paid debt with what is left, and drops a settled one', () => {
    const items = collectDangDueItems(
      [partial, settled, dang({ id: 'd3' })],
      '2026-10-10',
      '2026-11-10'
    )

    expect(items.map(item => [item.id, item.amount])).toEqual([
      ['d1', 70_000],
      ['d3', 100_000]
    ])
  })
})

describe('the debt reminder', () => {
  const rule = { kind: 'dang', enabled: true, daysBefore: 1, hour: 9, minute: 0 } as ReminderRule

  const remind = (...dangs: Dang[]) =>
    getUpcomingDueDateReminders('dang', dangs, rule, '2026-10-19')

  it('says what is left, not the full amount', () => {
    const [reminder] = remind(partial)

    expect(reminder.body).toContain('خرید لامپ')
    expect(reminder.body).toContain('۷۰')
    expect(reminder.body).not.toContain('۱۰۰')
  })

  it('stays silent for a settled debt', () => {
    expect(remind(settled)).toEqual([])
  })
})

describe('global search of debts', () => {
  const empty: SearchSources = {
    records: [],
    accounts: [],
    checks: [],
    dangs: [],
    receivables: [],
    installments: [],
    counterparties: [],
    holdings: [],
    goals: [],
    reminders: [],
    vehicles: []
  }

  const entries = buildSearchEntries({
    ...empty,
    dangs: [partial, settled, dang({ id: 'd3', title: 'کرایه', amount: 55_000 })]
  })

  const subtitleOf = (id: string) => entries.find(entry => entry.id === id)?.subtitle ?? ''

  it('finds a debt by its total, what is left and each payment', () => {
    const ids = (query: string) =>
      searchEntries(entries, query).groups.flatMap(group => group.items.map(item => item.id))

    expect(ids('70000')).toEqual(['d1'])
    expect(ids('30000')).toEqual(['d1'])
    expect(ids('100000').sort()).toEqual(['d1', 'd2'])
    expect(ids('55000')).toEqual(['d3'])
  })

  it('tells untouched, partly paid and settled debts apart in the subtitle', () => {
    expect(subtitleOf('d3')).not.toContain('پرداخت')
    expect(subtitleOf('d1')).toContain('پرداخت جزئی')
    expect(subtitleOf('d2')).toContain('پرداخت‌شده')
  })
})
