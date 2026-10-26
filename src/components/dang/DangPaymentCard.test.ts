import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'

import DangPaymentCard from './DangPaymentCard'
import type { DangAmountEditApi, DangPaymentsApi, DangWithRow } from './types'
import { ReadOnlyContext } from '../ui/readOnly'

const section = vi.hoisted(() => ({ props: null as null | Record<string, unknown> }))

vi.mock('../partialPayment/PartialPaymentSection', () => ({
  default: (props: Record<string, unknown>) => {
    section.props = props

    return null
  }
}))
vi.mock('../WriterAvatar', () => ({ default: () => null }))

const debt = (paid: number): DangWithRow =>
  ({
    id: 'd1',
    rowNumber: 2,
    title: 'خرید لامپ',
    category: 'خانه',
    counterparty: 'علی',
    amount: 100,
    date: '2026-01-01',
    note: 'یادداشت',
    payments: paid ? [{ id: 'p1', amount: paid, paidAt: '2026-01-02' }] : []
  } as unknown as DangWithRow)

const noop = vi.fn()

const payments: DangPaymentsApi = {
  payingId: '',
  settlingId: '',
  togglingPaymentId: '',
  paymentItemId: null,
  settlementItemId: null,
  linkedIds: ['r1'],
  setPaymentItemId: noop,
  setSettlementItemId: noop,
  handleAddPayment: noop,
  handleSettle: noop,
  handleRemovePayment: noop
}

const amountEdit: DangAmountEditApi = {
  savingAmountId: '',
  amountEdits: {},
  onAmountChange: noop,
  onAmountBlur: noop
}

function render(item: DangWithRow, options: { readOnly?: boolean; bodyOnly?: boolean } = {}) {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  section.props = null

  const host = document.createElement('div')

  const card = createElement(DangPaymentCard, {
    item,
    index: 0,
    expanded: true,
    payments,
    amountEdit,
    onExpand: noop,
    onEdit: noop,
    onDelete: noop,
    bodyOnly: options.bodyOnly
  })

  act(() =>
    createRoot(host).render(
      createElement(ReadOnlyContext.Provider, { value: options.readOnly ?? false }, card)
    )
  )

  return host
}

describe('personal debt card', () => {
  it('has no paid checkbox, only progress, paid and remaining', () => {
    const host = render(debt(40))
    const text = host.textContent ?? ''

    expect(host.querySelector('input[type=checkbox]')).toBeNull()
    expect(text).toContain('پرداخت شده:')
    expect(text).toContain('مانده:')
    expect(host.querySelector('[role=progressbar]')).not.toBeNull()
  })

  it('says «تسویه شده» for a debt with nothing left', () => {
    expect(render(debt(100)).textContent).toContain('تسویه شده')
  })

  it('shows no paid line for a debt nothing was paid on', () => {
    const text = render(debt(0)).textContent ?? ''

    expect(text).not.toContain('پرداخت شده:')
    expect(text).toContain('مانده:')
  })

  it('hands the shared section the remaining as the default payment amount', () => {
    render(debt(40))
    expect(section.props).toMatchObject({
      type: 'expense',
      paid: 40,
      remaining: 60,
      complete: false,
      defaultPaymentAmount: 60,
      defaultSettleTitle: '',
      linkedIds: ['r1']
    })
  })

  it('shows the lowest allowed amount under the amount field once something was paid', () => {
    expect(render(debt(40)).textContent).toContain('مجموع پرداخت‌ها')
    expect(render(debt(0)).textContent).not.toContain('مجموع پرداخت‌ها')
  })

  it('keeps the amount edit away from a read-only role', () => {
    const host = render(debt(40), { readOnly: true })

    expect(host.textContent).not.toContain('مبلغ بدهی')
    expect(section.props).not.toBeNull()
  })

  it('renders only the details for the desktop detail row', () => {
    const host = render(debt(40), { bodyOnly: true })

    expect(host.textContent).not.toContain('طرف حساب')
    expect(section.props).not.toBeNull()
  })
})
