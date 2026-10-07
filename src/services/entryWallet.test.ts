import { beforeEach, describe, expect, it } from 'vitest'

import type { ConfirmableSms } from './bankSmsApply'
import { updateBankSmsPrefs } from './bankSmsPrefs'
import { prepareEntryValues } from './entryWallet'

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

describe('prepareEntryValues', () => {
  beforeEach(() => localStorage.clear())

  it('keeps the account for a normal entry and for a new SMS', () => {
    expect(prepareEntryValues('expense', values)).toBe(values)
    expect(prepareEntryValues('expense', values, sms)).toBe(values)
  })

  it('drops the account when a newer «مانده» already includes the SMS', () => {
    updateBankSmsPrefs({ balanceStates: { acc: { anchor: 2000, lastAppliedAt: 2000 } } })

    expect(prepareEntryValues('expense', values, sms)).toEqual({ ...values, walletAccount: '' })
    // Another account is not covered by that «مانده».
    expect(prepareEntryValues('expense', { ...values, walletAccount: 'other' }, sms)).toEqual({
      ...values,
      walletAccount: 'other'
    })
  })
})
