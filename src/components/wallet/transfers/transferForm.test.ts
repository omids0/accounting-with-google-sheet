import { describe, expect, it } from 'vitest'

import {
  canTransferBetween,
  FROM_REQUIRED_MESSAGE,
  TO_REQUIRED_MESSAGE,
  transferOverdraftHint,
  validateTransferDraft,
  type TransferDraft
} from './transferForm'
import { SAME_ACCOUNT_MESSAGE } from '../../../services/transfers'
import { NON_POSITIVE_AMOUNT_MESSAGE } from '../../../utils/formValidation'

const draft: TransferDraft = {
  fromAccountId: 'a',
  toAccountId: 'b',
  amount: 100,
  date: '2026-10-27',
  note: ''
}

describe('validateTransferDraft', () => {
  it('accepts a complete draft', () => {
    expect(validateTransferDraft(draft)).toEqual({})
  })

  it('asks for both accounts', () => {
    expect(validateTransferDraft({ ...draft, fromAccountId: '', toAccountId: '' })).toEqual({
      from: FROM_REQUIRED_MESSAGE,
      to: TO_REQUIRED_MESSAGE
    })
  })

  it('refuses the same account with the service message', () => {
    expect(validateTransferDraft({ ...draft, toAccountId: 'a' }).to).toBe(SAME_ACCOUNT_MESSAGE)
  })

  it('uses the shared amount wording', () => {
    expect(validateTransferDraft({ ...draft, amount: '' }).amount).toBe('مبلغ را وارد کنید')
    expect(validateTransferDraft({ ...draft, amount: 0 }).amount).toBe(NON_POSITIVE_AMOUNT_MESSAGE)
  })

  it('needs a date', () => {
    expect(validateTransferDraft({ ...draft, date: '' }).date).toBeTruthy()
  })
})

describe('transferOverdraftHint', () => {
  const accounts = [
    { id: 'a', balance: 100 },
    { id: 'b', balance: 0 }
  ]

  it('is silent when the source covers the amount', () => {
    expect(transferOverdraftHint({ fromAccountId: 'a', amount: 100 }, accounts)).toBe('')
    expect(transferOverdraftHint({ fromAccountId: 'a', amount: 50 }, accounts)).toBe('')
  })

  it('warns when the balance would go negative', () => {
    expect(transferOverdraftHint({ fromAccountId: 'a', amount: 101 }, accounts)).toContain(
      'منفی می‌شود'
    )
  })

  it('is silent without a source or an amount', () => {
    expect(transferOverdraftHint({ fromAccountId: '', amount: 500 }, accounts)).toBe('')
    expect(transferOverdraftHint({ fromAccountId: 'a', amount: '' }, accounts)).toBe('')
  })
})

describe('canTransferBetween', () => {
  it('needs two accounts', () => {
    expect(canTransferBetween([1])).toBe(false)
    expect(canTransferBetween([1, 2])).toBe(true)
  })
})
