// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'

import BankSmsQueueTable from './BankSmsQueueTable'
import type { BankSmsReview } from './useBankSmsReview'
import type { BankSmsReviewItem } from '../../services/bankSmsQueue'

const candidate = (accountId: string) => ({ accountId, templateId: `t-${accountId}` })

const single = (result: Record<string, unknown>): BankSmsReviewItem =>
  ({
    kind: 'single',
    key: 'm1',
    entry: {
      sms: { id: 'm1', sender: 'bank', body: 'x', receivedAt: Date.now(), source: 'live' },
      result,
      amount: 3_000_000,
      balance: null
    },
    probableDuplicate: false,
    duplicateMovedBalance: false,
    duplicateOf: null,
    duplicatePayment: null,
    splitUncovered: null
  } as unknown as BankSmsReviewItem)

const matched = {
  kind: 'matched',
  accountId: 'acc1',
  direction: 'debit',
  ref: '',
  templateId: 't1'
}
const ambiguous = {
  kind: 'ambiguous',
  direction: 'debit',
  ref: '1111',
  candidates: [candidate('acc1'), candidate('acc2')]
}

async function render(item: BankSmsReviewItem) {
  const primary = vi.fn()
  const review = {
    items: [item],
    accounts: [
      { id: 'acc1', title: 'کارت ملی' },
      { id: 'acc2', title: 'کارت سپه' }
    ],
    busyKey: null,
    choiceFor: () => ({ category: 'خوراک', subCategory: '' }),
    offerFor: () => null,
    primary
  } as unknown as BankSmsReview
  const host = document.createElement('div')

  document.body.append(host)
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  await act(async () => createRoot(host).render(createElement(BankSmsQueueTable, { review })))

  const buttons = [...host.querySelectorAll('button')]
  const named = (text: string) => buttons.find(button => button.textContent?.trim() === text)

  return { host, primary, named }
}

describe('desktop queue table: an SMS whose account is ambiguous', () => {
  it('has no quick save: the row asks for the account and names every candidate', async () => {
    const { host, primary, named } = await render(single(ambiguous))

    expect(named('ثبت هزینه')).toBeUndefined()
    expect(host.textContent).toContain('کارت ملی یا کارت سپه ؟')

    expect(named('انتخاب حساب')).toBeDefined()
    expect(primary).not.toHaveBeenCalled()
  })

  it('a matched SMS keeps its one-click save', async () => {
    const { primary, named } = await render(single(matched))

    expect(named('انتخاب حساب')).toBeUndefined()
    act(() => named('ثبت هزینه')?.click())
    expect(primary).toHaveBeenCalledTimes(1)
  })
})
