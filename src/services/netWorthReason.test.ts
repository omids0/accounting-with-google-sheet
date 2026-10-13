import { describe, expect, it } from 'vitest'

import { eventsInRange, netWorthReason, vaultEventText } from './netWorthReason'

const income = [
  { name: 'حقوق', total: 2_000_000 },
  { name: 'عیدی', total: 5_000_000 }
]
const expense = [
  { name: 'خوراک', total: 900_000 },
  { name: 'اجاره', total: 3_000_000 }
]

describe('netWorthReason', () => {
  it('joins the top income category and the first event for a rise', () => {
    expect(
      netWorthReason({
        direction: 'rise',
        income,
        expense,
        events: [vaultEventText('sell', 'طلا')]
      })
    ).toBe('عیدی + فروش طلا')
  })

  it('uses the top two expense categories for a fall without events', () => {
    expect(netWorthReason({ direction: 'fall', income, expense, events: [] })).toBe('اجاره + خوراک')
  })

  it('falls back to the event alone, or nothing', () => {
    expect(
      netWorthReason({ direction: 'rise', income: [], expense, events: ['واریز به هدف «سفر»'] })
    ).toBe('واریز به هدف «سفر»')
    expect(netWorthReason({ direction: 'rise', income: [], expense: [], events: [] })).toBe('')
  })
})

describe('eventsInRange', () => {
  it('keeps distinct events of the month in date order', () => {
    const events = [
      { date: '2026-09-30', text: 'خرید ارز' },
      { date: '2026-09-25', text: 'فروش طلا' },
      { date: '2026-09-28', text: 'فروش طلا' },
      { date: '2026-10-30', text: 'خرید سهام و صندوق' }
    ]

    expect(eventsInRange(events, { start: '2026-09-23', end: '2026-10-22' })).toEqual([
      'فروش طلا',
      'خرید ارز'
    ])
  })
})
