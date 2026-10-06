import { describe, expect, it } from 'vitest'

import type { InstallmentPlan } from '../types'
import { reconcilePaymentsOnEdit } from './installmentsCalculations'
import { getPaidUntilFromPlan } from './installmentsDueDates'
import { buildPayments } from './installmentsSchedule'

const START = '2024-08-05'

function makePlan(count: number, amount = 1_000): InstallmentPlan {
  return {
    id: 'plan-1',
    createdAt: '2024-08-01',
    title: 'وام',
    amount,
    count,
    dueDay: 15,
    startDate: START,
    note: '',
    subCategory: '',
    payments: buildPayments(count, 15, START, amount)
  }
}

function markPaid(plan: InstallmentPlan, indexes: number[]): void {
  for (const index of indexes) {
    const payment = plan.payments[index]

    payment.paid = true
    payment.paidAt = payment.dueDate
    payment.transactionRecordId = `tx-${index + 1}`
  }
}

/** Form values as the edit modal prefills them, with optional overrides. */
type EditForm = Parameters<typeof reconcilePaymentsOnEdit>[1]

function formFor(plan: InstallmentPlan, overrides: Partial<EditForm> = {}): EditForm {
  return {
    title: plan.title,
    subCategory: plan.subCategory,
    amount: plan.amount,
    count: plan.count,
    dueDay: plan.dueDay,
    startDate: plan.startDate,
    note: plan.note,
    paidUntil: getPaidUntilFromPlan(plan),
    ...overrides
  }
}

function reconcile(plan: InstallmentPlan, data: EditForm) {
  const result = reconcilePaymentsOnEdit(plan, data)

  if ('error' in result) throw new Error(result.error)

  return result
}

describe('reconcilePaymentsOnEdit paid state', () => {
  it('keeps a gap in paid payments when only the title changes', () => {
    const plan = makePlan(5)

    markPaid(plan, [0, 1, 3])

    const result = reconcile(plan, formFor(plan, { title: 'وام مسکن' }))

    expect(result.title).toBe('وام مسکن')
    expect(result.payments.map(p => p.paid)).toEqual([true, true, false, true, false])
    expect(result.payments[3].transactionRecordId).toBe('tx-4')
  })

  it('applies «paid until» when the user changed it', () => {
    const plan = makePlan(5)

    markPaid(plan, [0, 1, 3])

    const result = reconcile(plan, formFor(plan, { paidUntil: plan.payments[2].dueDate }))

    expect(result.payments.map(p => p.paid)).toEqual([true, true, true, false, false])
  })
})

describe('reconcilePaymentsOnEdit amounts', () => {
  it('keeps paid and custom amounts and updates default unpaid ones', () => {
    const plan = makePlan(4, 1_000)

    markPaid(plan, [0])
    plan.payments[1].amount = 1_500
    delete plan.payments[3].amount

    const result = reconcile(plan, formFor(plan, { amount: 2_000, count: 5 }))

    expect(result.amount).toBe(2_000)
    expect(result.payments.map(p => p.amount)).toEqual([1_000, 1_500, 2_000, 2_000, 2_000])
  })

  it('pins the old plan amount on a paid legacy payment without its own amount', () => {
    const plan = makePlan(2, 1_000)

    markPaid(plan, [0])
    delete plan.payments[0].amount

    const result = reconcile(plan, formFor(plan, { amount: 3_000 }))

    expect(result.payments.map(p => p.amount)).toEqual([1_000, 3_000])
  })
})
