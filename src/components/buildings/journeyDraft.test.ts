import { describe, expect, it } from 'vitest'

import {
  accountError,
  countOf,
  EMPTY_FUND,
  EMPTY_PROFILE,
  fundError,
  fundTotal,
  profileError,
  profileFromDrafts
} from './journeyDraft'

const account = (patch = {}) => ({
  key: 'k',
  title: 'ملت',
  type: 'bank' as const,
  cardNumber: '6104337812345678',
  balance: 17_200_000,
  ...patch
})

describe('journey drafts', () => {
  it('reads counts typed with Persian digits', () => {
    expect(countOf('۱۲')).toBe(12)
    expect(countOf('abc')).toBe(0)
    expect(countOf('-3')).toBe(0)
  })

  it('needs a name, floors and units to leave step 1', () => {
    const profile = { ...EMPTY_PROFILE, name: 'نرگس', floors: '5', units: '12' }

    expect(profileError(profile)).toBeNull()
    expect(profileError({ ...profile, name: ' ' })).toBeTruthy()
    expect(profileError({ ...profile, floors: '' })).toBeTruthy()
    expect(profileError({ ...profile, units: '0' })).toBeTruthy()
  })

  it('needs an account and a charge to build the building', () => {
    const fund = { ...EMPTY_FUND, accounts: [account()], defaultCharge: 1_200_000 }

    expect(fundError(fund)).toBeNull()
    expect(fundError({ ...fund, accounts: [] })).toBeTruthy()
    expect(fundError({ ...fund, defaultCharge: '' })).toBeTruthy()
  })

  it('asks a bank account for its 16-digit card but not a cash one', () => {
    expect(accountError(account())).toBeNull()
    expect(accountError(account({ cardNumber: '6104' }))).toBeTruthy()
    expect(accountError(account({ type: 'cash', cardNumber: '' }))).toBeNull()
    expect(accountError(account({ title: '' }))).toBeTruthy()
  })

  it('totals the opening balances', () => {
    expect(fundTotal([account(), account({ balance: 1_200_000 })])).toBe(18_400_000)
  })

  it('builds the profile of the sheet from both drafts', () => {
    expect(
      profileFromDrafts(
        { ...EMPTY_PROFILE, name: ' نرگس ', address: 'ولنجک', floors: '۵', units: '12' },
        { ...EMPTY_FUND, accounts: [account()], defaultCharge: 1_200_000, issueDay: '3' }
      )
    ).toEqual({
      name: 'نرگس',
      address: 'ولنجک',
      floors: 5,
      defaultCharge: 1_200_000,
      chargeMethod: 'fixed',
      issueDay: 3,
      dueDay: 10,
      vacancyRule: 'half'
    })
  })
})
