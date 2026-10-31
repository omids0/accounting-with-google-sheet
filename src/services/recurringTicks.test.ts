import { describe, expect, it } from 'vitest'

import type { LedgerEntry } from './recordDuplicates'
import type { RecurringStatus } from './recurringStatus'
import { tickedIds } from './recurringTicks'
import type { RecurringItem } from '../types'

const item = (id: string): RecurringItem => ({
  id,
  createdAt: 't',
  type: 'expense',
  category: 'مسکن',
  subCategory: '',
  accountId: 'acc',
  amount: 1,
  title: id,
  dayOfMonth: 1,
  mode: 'reminder',
  lastPosted: '',
  active: true
})

const record = { id: 'x' } as LedgerEntry
const statuses = new Map<string, RecurringStatus>([
  ['new', { kind: 'new' }],
  ['registered', { kind: 'registered', record }],
  ['probable', { kind: 'probable', record }]
])
const items = [item('new'), item('registered'), item('probable')]

describe('tickedIds', () => {
  it('ticks nothing while the statuses are unknown, whatever was chosen', () => {
    expect(tickedIds(items, null, new Map()).size).toBe(0)
    expect(tickedIds(items, null, new Map([['new', true]])).size).toBe(0)
  })

  it('ticks only the new items once known; registered and probable start unticked', () => {
    expect([...tickedIds(items, statuses, new Map())]).toEqual(['new'])
  })

  it('lets the user tick again or untick', () => {
    const choices = new Map([
      ['registered', true],
      ['new', false]
    ])

    expect([...tickedIds(items, statuses, choices)]).toEqual(['registered'])
  })
})
