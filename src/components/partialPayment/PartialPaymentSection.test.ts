import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'

import PartialPaymentSection from './PartialPaymentSection'
import { ReadOnlyContext } from '../ui/readOnly'

vi.mock('./PartialPaymentForm', () => ({ default: () => null }))
vi.mock('./PartialSettlementForm', () => ({ default: () => null }))

const labels = {
  dateLabel: 'تاریخ',
  paymentForm: { amountLabel: 'مبلغ', submitLabel: 'ثبت' },
  settlementForm: { amountLabel: 'مبلغ', submitLabel: 'تسویه' }
}

function render(readOnly: boolean, complete = false) {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

  const host = document.createElement('div')
  const noop = vi.fn()

  const section = createElement(PartialPaymentSection, {
    itemId: 'i1',
    itemTitle: 'علی',
    type: 'income',
    labels,
    summaryDate: '2026-01-01',
    paid: 40,
    remaining: 60,
    complete,
    payments: [{ id: 'p1', amount: 40, paidAt: '2026-01-02' }],
    togglingPaymentId: '',
    paying: false,
    settling: false,
    showPaymentForm: false,
    showSettlementForm: false,
    defaultSettleTitle: '',
    defaultSettleNote: '',
    linkedIds: [],
    onOpenPaymentForm: noop,
    onClosePaymentForm: noop,
    onOpenSettlementForm: noop,
    onCloseSettlementForm: noop,
    onAddPayment: noop,
    onSettle: noop,
    onRemovePayment: noop
  })

  act(() =>
    createRoot(host).render(createElement(ReadOnlyContext.Provider, { value: readOnly }, section))
  )

  return host
}

describe('PartialPaymentSection', () => {
  it('offers part-payment and settle buttons to a writer', () => {
    const text = render(false).textContent ?? ''

    expect(text).toContain('+ ثبت بخشی از پرداخت')
    expect(text).toContain('تسویه')
  })

  it('shows the history but no buttons to a read-only role', () => {
    const host = render(true)

    expect(host.textContent).toContain('سوابق پرداخت')
    expect(host.textContent).not.toContain('+ ثبت بخشی از پرداخت')
    expect(host.querySelector('input[type=checkbox]')?.hasAttribute('disabled')).toBe(true)
  })

  it('has no buttons once the item is complete', () => {
    expect(render(false, true).textContent).not.toContain('+ ثبت بخشی از پرداخت')
  })
})
