import { beforeEach, describe, expect, it } from 'vitest'

import type { ConfirmableSms } from './bankSmsApply'
import { buildBankSmsEntryState } from './bankSmsEntry'
import { updateBankSmsPrefs } from './bankSmsPrefs'
import { prepareEntryValues, smsBalanceHint } from './entryWallet'

const sms: ConfirmableSms = {
  sms: { id: 's1', sender: '', body: '', receivedAt: 1000, source: 'live' },
  amount: 500,
  balance: null,
  result: {
    kind: 'matched',
    templateId: 't',
    accountId: 'acc',
    direction: 'debit',
    unit: 'rial',
    amount: 5000,
    balance: null,
    ref: ''
  }
}

const values = { amount: 500, walletAccount: 'acc', title: 'x' }

describe('smsBalanceHint', () => {
  beforeEach(() => localStorage.clear())

  it('explains the unchecked box only for the SMS account already in a newer «مانده»', () => {
    expect(smsBalanceHint(sms, 'acc')).toBeUndefined()

    updateBankSmsPrefs({ balanceStates: { acc: { anchor: 2000, lastAppliedAt: 2000 } } })

    expect(smsBalanceHint(sms, 'acc')).toBe('موجودی از پیامک جدیدتر به‌روز شده است')
    expect(smsBalanceHint(sms, 'other')).toBeUndefined()
    expect(smsBalanceHint(undefined, 'acc')).toBeUndefined()
  })
})

describe('bank SMS entry prefill', () => {
  beforeEach(() => localStorage.clear())

  it('starts with the balance update on, or off when a newer «مانده» covers the SMS', () => {
    expect(buildBankSmsEntryState(sms, 'کارت').bankSmsEntry.prefill.walletApply).toBe('بله')

    updateBankSmsPrefs({ balanceStates: { acc: { anchor: 2000, lastAppliedAt: 2000 } } })

    expect(buildBankSmsEntryState(sms, 'کارت').bankSmsEntry.prefill.walletApply).toBe('خیر')
  })
})

describe('prepareEntryValues', () => {
  beforeEach(() => localStorage.clear())

  it('keeps the account for a normal entry and for a new SMS', () => {
    expect(prepareEntryValues('expense', values)).toBe(values)
    expect(prepareEntryValues('expense', values, sms)).toBe(values)
  })

  it('keeps the account but skips the balance when a newer «مانده» already includes the SMS', () => {
    updateBankSmsPrefs({ balanceStates: { acc: { anchor: 2000, lastAppliedAt: 2000 } } })

    expect(prepareEntryValues('expense', values, sms)).toEqual({ ...values, walletApply: 'خیر' })
    // Another account is not covered by that «مانده».
    expect(prepareEntryValues('expense', { ...values, walletAccount: 'other' }, sms)).toEqual({
      ...values,
      walletAccount: 'other'
    })
  })
})
