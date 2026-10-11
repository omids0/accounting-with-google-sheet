import { describe, expect, it } from 'vitest'

import { getPathForTab, getTabFromPath } from './paths'

describe('wallet account detail path', () => {
  it('opens the account history for /wallet/<id>', () => {
    expect(getTabFromPath('/wallet/abc')).toBe('wallet-account-detail')
  })

  it('keeps the opening balances page on its own path', () => {
    expect(getTabFromPath('/wallet/opening-balances')).toBe('opening-balances')
    expect(getTabFromPath('/wallet')).toBe('wallet')
  })

  it('builds the path from the account id', () => {
    expect(getPathForTab('wallet-account-detail', { walletAccountId: 'a b' })).toBe('/wallet/a%20b')
    expect(getPathForTab('wallet-account-detail')).toBe('/wallet')
  })
})
