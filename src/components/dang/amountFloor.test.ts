import { beforeEach, describe, expect, it, vi } from 'vitest'

import { dangAmountFloor, guardDangAmount } from './amountFloor'
import { dangBelowPaidMessage } from './paymentLabels'
import { formatMoney } from '../../utils/formatMoney'
import { showError } from '../../utils/toast'

vi.mock('../../utils/toast', () => ({ showError: vi.fn(), showSuccess: vi.fn() }))

const paidDebt = {
  payments: [
    { id: 'p1', amount: 30, paidAt: '2026-01-01', note: '' },
    { id: 'p2', amount: 20, paidAt: '2026-01-02', note: '' }
  ]
}

beforeEach(() => vi.clearAllMocks())

describe('dangAmountFloor', () => {
  it('is the paid total once something was paid', () => {
    expect(dangAmountFloor(paidDebt)).toBe(50)
  })

  it('is empty while nothing was paid, so no hint is shown', () => {
    expect(dangAmountFloor({ payments: [] })).toBeUndefined()
  })
})

describe('guardDangAmount', () => {
  it('lets an amount at or above the paid total through silently', () => {
    expect(guardDangAmount(paidDebt, 50)).toBe(true)
    expect(guardDangAmount(paidDebt, 80)).toBe(true)
    expect(showError).not.toHaveBeenCalled()
  })

  it('refuses an amount below the paid total and says why in Persian', () => {
    expect(guardDangAmount(paidDebt, 49)).toBe(false)
    expect(showError).toHaveBeenCalledWith(dangBelowPaidMessage(formatMoney(50)))
    expect(dangBelowPaidMessage('x')).toContain('کمتر از مجموع پرداخت‌ها')
  })

  it('has no floor for a debt nothing was paid on', () => {
    expect(guardDangAmount({ payments: [] }, 1)).toBe(true)
  })
})
