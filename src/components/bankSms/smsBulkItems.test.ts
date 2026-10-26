import { describe, expect, it, vi } from 'vitest'

import { smsBulkItems } from './smsBulkItems'
import type { SmsChoice } from './useBankSmsReview'
import type { BankSmsReviewItem, ConfirmableSms } from '../../services/bankSmsQueue'

vi.mock('../../services/workspace', () => ({ isPersonalWorkspace: () => true }))

const entry = (id: string, direction: 'debit' | 'credit'): ConfirmableSms =>
  ({
    sms: { id, body: '', receivedAt: 1 },
    amount: 20_000_000,
    balance: null,
    result: { kind: 'matched', accountId: 'a1', direction }
  } as unknown as ConfirmableSms)

const single = (e: ConfirmableSms): BankSmsReviewItem =>
  ({
    kind: 'single',
    key: e.sms.id,
    entry: e,
    probableDuplicate: false
  } as unknown as BankSmsReviewItem)

const choiceOf = (category: string): SmsChoice => ({ category, subCategory: '' })

describe('smsBulkItems', () => {
  const choices: Record<string, SmsChoice> = {
    food: choiceOf('خوراک'),
    debt: choiceOf('بدهی'),
    owed: choiceOf('طلب'),
    car: choiceOf('خودرو')
  }

  const items = [
    single(entry('food', 'debit')),
    single(entry('debt', 'debit')),
    single(entry('owed', 'credit')),
    single(entry('car', 'debit'))
  ]

  it('never saves «بدهی» or «طلب» (or «خودرو») silently: the card asks first', () => {
    const bulk = smsBulkItems(
      items,
      () => null,
      e => choices[e.sms.id] ?? null
    )

    expect(bulk.map(item => item.entry.sms.id)).toEqual(['food'])
  })

  it('keeps «طلب» for an expense-direction SMS out of the question (the type decides)', () => {
    const bulk = smsBulkItems(
      [single(entry('x', 'debit'))],
      () => null,
      () => choiceOf('طلب')
    )

    expect(bulk).toHaveLength(1)
  })
})
