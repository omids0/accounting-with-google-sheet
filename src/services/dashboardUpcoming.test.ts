import { describe, expect, it } from 'vitest'

import {
  formatDueRelative,
  orderDashboardReminders,
  summarizeUpcoming,
  type DashboardReminderItem
} from './dashboardReminders'

function item(
  id: string,
  dueDate: string,
  status: DashboardReminderItem['status']
): DashboardReminderItem {
  return {
    id,
    kind: 'installments',
    kindLabel: 'اقساط',
    title: id,
    subtitle: '',
    dueDate,
    amount: 1000,
    status
  }
}

const today = '2026-10-12'

const items = [
  item('next-week', '2026-10-19', 'upcoming'),
  item('late-recent', '2026-10-10', 'overdue'),
  item('today', '2026-10-12', 'today'),
  item('late-old', '2026-10-01', 'overdue'),
  item('tomorrow', '2026-10-13', 'upcoming')
]

describe('orderDashboardReminders', () => {
  it('puts overdue items first (oldest first), then today, then upcoming by date', () => {
    expect(orderDashboardReminders(items).map(entry => entry.id)).toEqual([
      'late-old',
      'late-recent',
      'today',
      'tomorrow',
      'next-week'
    ])
  })

  it('does not reorder the input array', () => {
    const copy = [...items]

    orderDashboardReminders(items)
    expect(items).toEqual(copy)
  })
})

describe('summarizeUpcoming', () => {
  it('returns three rows with overdue leading and counts every overdue item', () => {
    const summary = summarizeUpcoming(items, today)

    expect(summary.rows.map(row => row.item.id)).toEqual(['late-old', 'late-recent', 'today'])
    expect(summary.rows.map(row => row.days)).toEqual([-11, -2, 0])
    expect(summary.overdueCount).toBe(2)
  })

  it('counts overdue items even when they do not fit in the rows', () => {
    const many = [1, 2, 3, 4].map(day => item(`late-${day}`, `2026-10-0${day}`, 'overdue'))

    expect(summarizeUpcoming(many, today).overdueCount).toBe(4)
    expect(summarizeUpcoming(many, today).rows).toHaveLength(3)
  })

  it('is empty without items', () => {
    expect(summarizeUpcoming([], today)).toEqual({ rows: [], overdueCount: 0 })
  })
})

describe('formatDueRelative', () => {
  it('words overdue, today and upcoming dates', () => {
    expect(formatDueRelative('overdue', -5)).toBe('معوق · ۵ روز گذشته')
    expect(formatDueRelative('today', 0)).toBe('امروز')
    expect(formatDueRelative('upcoming', 15)).toBe('۱۵ روز دیگر')
  })
})
