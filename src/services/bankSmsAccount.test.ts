import { describe, expect, it } from 'vitest'

import { initialCardAccount, initialSmsAccount, resolveSmsAccount } from './bankSmsAccount'
import type { ReviewedSms } from './bankSmsQueue'

const candidate = (accountId: string) => ({ accountId, templateId: `t-${accountId}` })

const ambiguous = (...ids: string[]) =>
  ({
    sms: { id: 'm1' },
    amount: 3_000_000,
    balance: null,
    result: {
      kind: 'ambiguous',
      direction: 'debit',
      unit: 'toman',
      amount: 3,
      balance: null,
      ref: '1111',
      candidates: ids.map(candidate)
    }
  } as unknown as ReviewedSms)

const matched = {
  sms: { id: 'm2' },
  amount: 3_000_000,
  balance: null,
  result: { kind: 'matched', accountId: 'acc1' }
} as unknown as ReviewedSms

describe('the account a phone card starts on', () => {
  it('is the SMS own account when it matched one', () => {
    expect(initialCardAccount(matched)).toBe('acc1')
  })

  it('is NONE when the card digits fit several accounts: nothing is saved or learned on a guess', () => {
    const entry = ambiguous('acc1', 'acc2')

    expect(initialCardAccount(entry)).toBe('')
    expect(resolveSmsAccount(entry, initialCardAccount(entry))).toBeNull()
    // The desktop table still names the first candidate for its row (it asks before saving).
    expect(initialSmsAccount(entry)).toBe('acc1')
  })

  it('a single candidate is not a question', () => {
    expect(initialCardAccount(ambiguous('acc1'))).toBe('acc1')
  })

  it('tapping a chip resolves the SMS on that account', () => {
    expect(resolveSmsAccount(ambiguous('acc1', 'acc2'), 'acc2')?.result).toMatchObject({
      kind: 'matched',
      accountId: 'acc2'
    })
  })
})
