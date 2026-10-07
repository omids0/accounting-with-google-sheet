import { describe, expect, it } from 'vitest'

import { netWalletChanges, walletEffectOf } from './recordWallet'

describe('walletEffectOf', () => {
  it('subtracts expenses and adds income for the chosen account', () => {
    expect(walletEffectOf('expense', { amount: '120000', walletAccount: 'a' })).toEqual({
      accountId: 'a',
      delta: -120000
    })
    expect(walletEffectOf('income', { amount: '۵۰٬۰۰۰', walletAccount: 'a' })).toEqual({
      accountId: 'a',
      delta: 50000
    })
  })

  it('has no effect without an account, an amount, or for custom forms', () => {
    expect(walletEffectOf('expense', { amount: '100', walletAccount: '' })).toBeNull()
    expect(walletEffectOf('expense', { amount: '', walletAccount: 'a' })).toBeNull()
    expect(walletEffectOf('custom', { amount: '100', walletAccount: 'a' })).toBeNull()
  })
})

describe('netWalletChanges', () => {
  const expense = (accountId: string, amount: number) => ({ accountId, delta: -amount })

  it('applies a new record and undoes a deleted one', () => {
    expect([...netWalletChanges(null, expense('a', 100))]).toEqual([['a', -100]])
    expect([...netWalletChanges(expense('a', 100), null)]).toEqual([['a', 100]])
  })

  it('applies only the difference when the amount is edited', () => {
    expect([...netWalletChanges(expense('a', 100), expense('a', 130))]).toEqual([['a', -30]])
    expect(netWalletChanges(expense('a', 100), expense('a', 100)).size).toBe(0)
  })

  it('moves the amount between accounts when the account is changed', () => {
    expect([...netWalletChanges(expense('a', 100), expense('b', 100))]).toEqual([
      ['a', 100],
      ['b', -100]
    ])
  })
})
