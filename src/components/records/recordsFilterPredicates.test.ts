import { describe, expect, it } from 'vitest'

import {
  ALL_COUNTERPARTIES,
  ALL_WALLET_ACCOUNTS,
  distinctWalletAccounts,
  matchesAmountRangeFilter,
  matchesWalletAccountFilter,
  orderedRange,
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

describe('wallet account and amount filters', () => {
  const rows: { values: Record<string, string> }[] = [
    { values: { amount: '1000', walletAccount: 'a1' } },
    { values: { amount: '5000', walletAccount: 'a2' } },
    { values: { amount: '9000' } }
  ]

  it('keeps the records of one account', () => {
    expect(rows.filter(row => matchesWalletAccountFilter(row, 'a1'))).toEqual([rows[0]])
    expect(rows.filter(row => matchesWalletAccountFilter(row, ALL_WALLET_ACCOUNTS))).toHaveLength(3)
    expect(distinctWalletAccounts(rows)).toEqual(['a1', 'a2'])
  })

  it('keeps amounts between min and max, either end open, bounds included', () => {
    const amounts = (min: number | '', max: number | '') =>
      rows.filter(row => matchesAmountRangeFilter(row, min, max)).map(row => row.values.amount)

    expect(amounts('', '')).toEqual(['1000', '5000', '9000'])
    expect(amounts(5000, '')).toEqual(['5000', '9000'])
    expect(amounts('', 5000)).toEqual(['1000', '5000'])
    expect(amounts(1000, 5000)).toEqual(['1000', '5000'])
    expect(amounts(6000, 8000)).toEqual([])
  })

  it('swaps a reversed range', () => {
    expect(orderedRange(9000, 1000)).toEqual([1000, 9000])
    expect(orderedRange('', 1000)).toEqual(['', 1000])
    expect(orderedRange(1000, 9000)).toEqual([1000, 9000])
  })
})
