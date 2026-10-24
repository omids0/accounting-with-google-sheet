import { describe, expect, it } from 'vitest'

import { pickFundAccount } from './useEntryFundAccount'

describe('pickFundAccount', () => {
  it('starts with the account used last when it still exists', () => {
    expect(pickFundAccount(['a', 'b', 'c'], 'b')).toBe('b')
  })

  it('falls back to the first (or only) fund account', () => {
    expect(pickFundAccount(['a', 'b'], '')).toBe('a')
    expect(pickFundAccount(['a', 'b'], 'deleted')).toBe('a')
    expect(pickFundAccount(['only'], '')).toBe('only')
  })

  it('leaves the account empty when the building has none', () => {
    expect(pickFundAccount([], 'b')).toBe('')
  })
})
