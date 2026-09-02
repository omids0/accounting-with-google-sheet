import type { InstallmentPayment } from '../types'
import { paymentScheduleCache } from './installmentsConstants'
import { getInstallmentDueDate } from './installmentsDueDates'
import { addJalaliMonths } from '../utils/jalaliDate'
import { normalizeSheetDate } from '../utils/sheetValues'

export function applyPaidUntilToPayments(
  payments: InstallmentPayment[],
  paidUntil: string
): InstallmentPayment[] {
  if (!paidUntil) return payments

  return payments.map(payment => {
    if (payment.dueDate <= paidUntil) {
      return {
        ...payment,
        paid: true,
        paidAt: payment.paidAt || payment.dueDate
      }
    }
    if (!payment.paid) return payment

    return {
      ...payment,
      paid: false,
      paidAt: '',
      transactionRecordId: undefined
    }
  })
}

export function buildPayments(
  count: number,
  dueDay: number,
  startDate: string,
  amount: number,
  paidUntil = ''
): InstallmentPayment[] {
  const payments = Array.from({ length: count }, (_, i) => ({
    n: i + 1,
    paid: false,
    paidAt: '',
    dueDate: getInstallmentDueDate(startDate, dueDay, i),
    amount
  }))

  return applyPaidUntilToPayments(payments, paidUntil)
}

function shouldRebuildPaymentSchedule(
  startDate: string,
  dueDay: number,
  payments: InstallmentPayment[]
): boolean {
  if (payments.length === 0) return true

  const first = normalizeSheetDate(payments[0].dueDate)

  if (!first) return true
  if (first <= startDate) return true

  const expectedFirst = getInstallmentDueDate(startDate, dueDay, 0)

  if (first === expectedFirst) {
    return payments.some(
      (payment, index) =>
        normalizeSheetDate(payment.dueDate) !== getInstallmentDueDate(startDate, dueDay, index)
    )
  }

  const legacyFirst = addJalaliMonths(startDate, 0, dueDay)

  return first === legacyFirst
}

function migratePaymentSchedule(
  parsed: InstallmentPayment[],
  startDate: string,
  dueDay: number,
  count: number,
  planAmount: number
): InstallmentPayment[] {
  const paidUntil = parsed
    .filter(payment => payment.paid)
    .reduce(
      (max, payment) => (payment.dueDate > max ? normalizeSheetDate(payment.dueDate) : max),
      ''
    )

  const schedule = Array.from({ length: count }, (_, index) => {
    const existing = parsed[index]

    return {
      n: index + 1,
      paid: false,
      paidAt: '',
      dueDate: getInstallmentDueDate(startDate, dueDay, index),
      amount: existing?.amount ?? planAmount,
      transactionRecordId: undefined as string | undefined
    }
  })

  return applyPaidUntilToPayments(schedule, paidUntil).map((payment, index) => ({
    ...payment,
    paidAt: payment.paid ? parsed[index]?.paidAt || payment.dueDate : '',
    transactionRecordId: payment.paid ? parsed[index]?.transactionRecordId : undefined
  }))
}

export function parsePayments(
  planId: string,
  raw: string,
  count: number,
  dueDay: number,
  startDate: string,
  planAmount: number
): InstallmentPayment[] {
  if (!raw) return buildPayments(count, dueDay, startDate, planAmount)

  const cacheKey = `${planId}:${raw}`

  const cached = paymentScheduleCache.get(cacheKey)

  if (cached) return cached.map(payment => ({ ...payment }))

  try {
    const parsed = JSON.parse(raw) as InstallmentPayment[]

    if (!Array.isArray(parsed) || parsed.length !== count) {
      return buildPayments(count, dueDay, startDate, planAmount)
    }

    const normalized = parsed.map((payment, index) => ({
      ...payment,
      n: index + 1,
      amount: payment.amount ?? planAmount,
      dueDate: normalizeSheetDate(payment.dueDate) || payment.dueDate
    }))

    const result = shouldRebuildPaymentSchedule(startDate, dueDay, normalized)
      ? migratePaymentSchedule(normalized, startDate, dueDay, count, planAmount)
      : normalized

    paymentScheduleCache.set(cacheKey, result)

    return result.map(payment => ({ ...payment }))
  } catch {
    return buildPayments(count, dueDay, startDate, planAmount)
  }
}
