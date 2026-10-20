import { describe, expect, it } from 'vitest'

import {
  ALL_COUNTERPARTIES,
  distinctCounterparties,
  matchesCounterpartyFilter,
  matchesWithItemsFilter,
  recordCounterparty,
  recordLineItems,
  recordWalletState
} from './recordsFilterPredicates'
import { serializeLineItems } from '../../utils/lineItems'

const withItems = {
  values: {
    counterparty: ' رضا ',
    lineItems: serializeLineItems([{ name: 'کیوی', amount: 100 }])
  }
}

const plain = { values: { title: 'نان' } }

describe('recordsFilterPredicates', () => {
  it('reads the counterparty and the items of a record', () => {
    expect(recordCounterparty(withItems)).toBe('رضا')
    expect(recordCounterparty(plain)).toBe('')
    expect(recordLineItems(withItems)).toEqual([{ name: 'کیوی', amount: 100 }])
    expect(recordLineItems(plain)).toEqual([])
  })

  it('matches every record when the counterparty filter is «all»', () => {
    expect(matchesCounterpartyFilter(plain, ALL_COUNTERPARTIES)).toBe(true)
    expect(matchesCounterpartyFilter(withItems, 'رضا')).toBe(true)
    expect(matchesCounterpartyFilter(plain, 'رضا')).toBe(false)
    expect(matchesCounterpartyFilter(withItems, 'علی')).toBe(false)
  })

  it('keeps only records with items when asked', () => {
    expect(matchesWithItemsFilter(plain, false)).toBe(true)
    expect(matchesWithItemsFilter(plain, true)).toBe(false)
    expect(matchesWithItemsFilter(withItems, true)).toBe(true)
    expect(matchesWithItemsFilter({ values: { lineItems: 'not json' } }, true)).toBe(false)
  })

  it('lists each counterparty once, sorted', () => {
    expect(
      distinctCounterparties([
        { values: { counterparty: 'ب' } },
        { values: { counterparty: 'الف' } },
        { values: { counterparty: 'ب ' } },
        plain
      ])
    ).toEqual(['الف', 'ب'])
  })
})

describe('recordWalletState', () => {
  it('tells which records moved an account balance', () => {
    expect(recordWalletState({ values: { walletAccount: 'a1' } })).toBe('applied')
    expect(recordWalletState({ values: { walletAccount: 'a1', walletApply: 'بله' } })).toBe(
      'applied'
    )
    expect(recordWalletState({ values: { walletAccount: 'a1', walletApply: 'خیر' } })).toBe(
      'skipped'
    )
    expect(recordWalletState({ values: { walletApply: 'خیر' } })).toBe('none')
    expect(recordWalletState(plain)).toBe('none')
  })
})
