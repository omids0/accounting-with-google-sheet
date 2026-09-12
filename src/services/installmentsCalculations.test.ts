import { describe, expect, it } from 'vitest'

import type { InstallmentPlan } from '../types'
import {
  getInstallmentDueDateInRange,
  isInstallmentPlanVisible,
  isInstallmentSettledForRange,
  totalInstallmentsInRange,
  totalUnpaidInstallments
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
  const mordadRange = { start: '2024-07-23', end: '2024-08-22' }

  it('shows the in-range due date after the current month installment is paid', () => {
    const payments = buildPayments(3, 15, '2024-08-05', 1_000_000)

    payments[0].paid = true
    payments[0].paidAt = payments[0].dueDate

    const plan = makePlan(payments)

    expect(getInstallmentDueDateInRange(plan, shahrivarRange)).toBe(payments[0].dueDate)
    expect(getInstallmentDueDateInRange(plan, mehrRange)).toBe(payments[1].dueDate)
    expect(isInstallmentSettledForRange(plan, shahrivarRange)).toBe(true)
  })

  it('shows completed plans in every month that had an installment due', () => {
    const payments = buildPayments(3, 15, '2024-08-05', 1_000_000).map(payment => ({
      ...payment,
      paid: true,
      paidAt: payment.dueDate
    }))

    const plan = makePlan(payments)

    expect(isInstallmentPlanVisible(plan, shahrivarRange)).toBe(true)
    expect(isInstallmentPlanVisible(plan, mehrRange)).toBe(true)
    expect(isInstallmentPlanVisible(plan, { start: '2024-11-01', end: '2024-11-30' })).toBe(true)
    expect(isInstallmentPlanVisible(plan, mordadRange)).toBe(false)
  })

  it('hides plans before their first due month and after their schedule ends', () => {
    const payments = buildPayments(3, 15, '2024-08-05', 1_000_000)
    const plan = makePlan(payments)

    expect(isInstallmentPlanVisible(plan, mordadRange)).toBe(false)
    expect(isInstallmentPlanVisible(plan, shahrivarRange)).toBe(true)
    expect(isInstallmentPlanVisible(plan, mehrRange)).toBe(true)
    expect(isInstallmentPlanVisible(plan, { start: '2024-12-01', end: '2024-12-31' })).toBe(false)
  })

  it('totals only include payments due in the selected range', () => {
    const payments = buildPayments(3, 15, '2024-08-05', 1_000_000)

    const plan = makePlan(payments)

    expect(totalInstallmentsInRange([plan], shahrivarRange)).toBe(1_000_000)
    expect(totalInstallmentsInRange([plan], mehrRange)).toBe(1_000_000)
    expect(totalUnpaidInstallments([plan], shahrivarRange)).toBe(1_000_000)
    expect(totalUnpaidInstallments([plan], mehrRange)).toBe(1_000_000)
  })

  it('changes month totals when completed plans drop out of the visible list', () => {
    const completedPayments = buildPayments(1, 15, '2024-08-05', 2_000_000).map(payment => ({
      ...payment,
      paid: true,
      paidAt: payment.dueDate
    }))

    const completedPlan = makePlan(completedPayments, { id: 'completed' })

    const activePlan = makePlan(buildPayments(3, 15, '2024-08-05', 1_000_000), { id: 'active' })

    const shahrivarVisible = [completedPlan, activePlan]
    const mehrVisible = [activePlan]

    expect(totalInstallmentsInRange(shahrivarVisible, shahrivarRange)).toBe(3_000_000)
    expect(totalInstallmentsInRange(mehrVisible, mehrRange)).toBe(1_000_000)
  })

  it('reflects completed installments in historical month totals', () => {
    const payments = buildPayments(3, 15, '2024-08-05', 1_000_000).map(payment => ({
      ...payment,
      paid: true,
      paidAt: payment.dueDate
    }))

    const plan = makePlan(payments)

    expect(totalInstallmentsInRange([plan], shahrivarRange)).toBe(1_000_000)
    expect(totalInstallmentsInRange([plan], mehrRange)).toBe(1_000_000)
    expect(totalInstallmentsInRange([plan], mordadRange)).toBe(0)
  })
})
