import { describe, expect, it } from 'vitest'

import { fundAccountDraft, fundAccountMeta } from './fundRows'
import { WALLET_ACCOUNT_KIND_BANK, WALLET_ACCOUNT_KIND_CASH } from '../../services/walletCategories'

const bank = {
  id: 'a1',
  title: 'ملت',
  balance: 17_200_000,
  accountKind: WALLET_ACCOUNT_KIND_BANK,
  cardNumber: '6104337712343210'
}

const cash = { ...bank, id: 'a2', title: 'نقدی سرایدار', accountKind: WALLET_ACCOUNT_KIND_CASH }

describe('fund account rows', () => {
  it('describes the card of a bank account and a cash box', () => {
    expect(fundAccountMeta(bank)).toBe('کارت ۶۱۰۴…۳۲۱۰')
    expect(fundAccountMeta({ ...bank, cardNumber: '' })).toBe('بانکی')
    expect(fundAccountMeta(cash)).toBe('نقدی')
  })

  it('turns an account into the draft the account sheet edits', () => {
    expect(fundAccountDraft(bank)).toEqual({
      key: 'a1',
      title: 'ملت',
      type: 'bank',
      cardNumber: '6104337712343210',
      balance: 17_200_000
    })
    expect(fundAccountDraft(cash)).toMatchObject({ type: 'cash', cardNumber: '' })
  })
})
