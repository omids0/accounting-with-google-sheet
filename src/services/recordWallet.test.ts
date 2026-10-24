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

  it('has no effect when the record opted out of moving the balance', () => {
    expect(
      walletEffectOf('expense', { amount: '100', walletAccount: 'a', walletApply: 'خیر' })
    ).toBeNull()
  })

  it('keeps the effect for rows saved before the switch and for an explicit yes', () => {
    expect(
      walletEffectOf('expense', { amount: '100', walletAccount: 'a', walletApply: '' })
    ).toEqual({ accountId: 'a', delta: -100 })
    expect(
      walletEffectOf('income', { amount: '100', walletAccount: 'a', walletApply: 'بله' })
    ).toEqual({ accountId: 'a', delta: 100 })
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

describe('wallet changes carry no floating-point noise', () => {
  it('nets fractional edits to two decimals', () => {
    const effect = (amount: number) => ({ accountId: 'a', delta: amount })

    expect([...netWalletChanges(effect(0.1), effect(0.30000000000000004))]).toEqual([['a', 0.2]])
    expect([...netWalletChanges(effect(10931882.3), effect(10931882.3))]).toEqual([])
  })
})
