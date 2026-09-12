import { describe, expect, it } from 'vitest'

import type { InstallmentPlan } from '../types'
import {
  getInstallmentDueDateInRange,
  isInstallmentPlanVisible,
  isInstallmentSettledForRange
} from './installmentsCalculations'
import { buildPayments } from './installmentsSchedule'

function makePlan(
  payments: InstallmentPlan['payments'],
  overrides: Partial<InstallmentPlan> = {}
): InstallmentPlan {
  return {
    id: 'plan-1',
    createdAt: '2024-08-01',
    title: 'Test plan',
    amount: 1_000_000,
    count: payments.length,
    dueDay: 15,
    startDate: '2024-08-05',
    note: '',
    payments,
    ...overrides
  }
}

describe('installmentsCalculations display rules', () => {
  const shahrivarRange = { start: '2024-08-23', end: '2024-09-21' }
  const mehrRange = { start: '2024-09-22', end: '2024-10-21' }

  it('shows the next unpaid due date after the current month is paid', () => {
    const payments = buildPayments(3, 15, '2024-08-05', 1_000_000)

    payments[0].paid = true
    payments[0].paidAt = payments[0].dueDate

    const plan = makePlan(payments)

    expect(getInstallmentDueDateInRange(plan, shahrivarRange)).toBe(payments[1].dueDate)
    expect(isInstallmentSettledForRange(plan, shahrivarRange)).toBe(true)
  })

  it('hides fully completed plans outside the final installment month', () => {
    const payments = buildPayments(3, 15, '2024-08-05', 1_000_000).map(payment => ({
      ...payment,
      paid: true,
      paidAt: payment.dueDate
    }))

    const plan = makePlan(payments)

    expect(isInstallmentPlanVisible(plan, shahrivarRange)).toBe(false)
    expect(isInstallmentPlanVisible(plan, mehrRange)).toBe(false)
    expect(isInstallmentPlanVisible(plan, { start: '2024-11-01', end: '2024-11-30' })).toBe(true)
  })

  it('keeps active plans visible when the next due date is in a later month', () => {
    const payments = buildPayments(3, 15, '2024-08-05', 1_000_000)

    payments[0].paid = true
    payments[0].paidAt = payments[0].dueDate

    const plan = makePlan(payments)

    expect(isInstallmentPlanVisible(plan, shahrivarRange)).toBe(true)
    expect(isInstallmentSettledForRange(plan, shahrivarRange)).toBe(true)
    expect(isInstallmentSettledForRange(plan, mehrRange)).toBe(false)
  })
})
