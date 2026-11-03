import { describe, expect, it } from 'vitest'

import type { BankSmsReviewItem } from './bankSmsQueue'
import { smsOf } from './bankSmsQueueTestKit'
import { findQuickItem, quickSmsIdFor, quickSmsState } from './launchActionSmsQuick'

const single = (id: string): BankSmsReviewItem => ({
  kind: 'single',
  key: id,
  entry: smsOf(id, 50_000),
  probableDuplicate: false,
  duplicateMovedBalance: false,
  duplicateOf: null,
  duplicatePayment: null,
  splitUncovered: null
})

const transfer = (key: string): BankSmsReviewItem => {
  const leg = smsOf(key, 50_000) as Extract<BankSmsReviewItem, { kind: 'transfer' }>['debit']

  return { kind: 'transfer', key, debit: leg, credit: leg, duplicateLegs: [] } as never
}

describe('quickSmsIdFor', () => {
  it('opens the sheet only in a personal workspace', () => {
    const action = { kind: 'smsQuick', id: 'ab' } as const

    expect(quickSmsIdFor(action, 'personal')).toBe('ab')
    expect(quickSmsIdFor(action, 'building')).toBeNull()
    expect(quickSmsIdFor(action, 'shared')).toBeNull()
    expect(quickSmsIdFor({ kind: 'sms' }, 'personal')).toBeNull()
  })
})

describe('findQuickItem', () => {
  it('finds a recognised single SMS by its id', () => {
    const items = [single('a1'), single('b2')]

    expect(findQuickItem(items, 'b2')?.key).toBe('b2')
    expect(findQuickItem(items, 'c3')).toBeNull()
  })

  it('does not take a transfer pair', () => {
    expect(findQuickItem([transfer('t1')], 't1')).toBeNull()
  })

  it('does not take an unrecognised text', () => {
    const item = single('u1') as Extract<BankSmsReviewItem, { kind: 'single' }>
    const unknown = {
      ...item,
      entry: { ...item.entry, result: { kind: 'unknown' } }
    } as unknown as BankSmsReviewItem

    expect(findQuickItem([unknown], 'u1')).toBeNull()
  })
})

describe('quickSmsState', () => {
  const items = [single('a1')]

  it('waits while the queue is loading, then falls back to the page', () => {
    expect(quickSmsState({ id: 'zz', items: [], settled: false, wasShown: false })).toEqual({
      state: 'wait'
    })
    expect(quickSmsState({ id: 'zz', items, settled: true, wasShown: false })).toEqual({
      state: 'fallback'
    })
  })

  it('shows the card as soon as it is there, loaded or not', () => {
    expect(quickSmsState({ id: 'a1', items, settled: false, wasShown: false }).state).toBe('show')
    expect(quickSmsState({ id: 'a1', items, settled: true, wasShown: true }).state).toBe('show')
  })

  it('closes, not falls back, once a shown card has left the list', () => {
    expect(quickSmsState({ id: 'a1', items: [], settled: true, wasShown: true })).toEqual({
      state: 'done'
    })
  })
})
