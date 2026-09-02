import type { InstallmentPlan } from '../types'
import {
  INSTALLMENTS_CACHE_TTL_MS,
  INSTALLMENTS_HEADERS,
  INSTALLMENTS_SHEET,
  getInstallmentPaymentAmount,
  installmentsCache,
  invalidateInstallmentsCache
} from './installmentsConstants'
import { buildPayments, parsePayments } from './installmentsSchedule'
import { createLinkedExpenseRecord, deleteLinkedExpenseRecord } from './paymentTransactions'
import {
  appendSheetRow,
  deleteSheetRow,
  ensureSheetWithHeaders,
  fetchSheetRows,
  updateSheetRow
} from './sheets'
import { getTodayIso } from '../utils/jalaliDate'
import { normalizeSheetDate } from '../utils/sheetValues'

function rowToPlan(row: string[], rowNumber: number): InstallmentPlan & { rowNumber: number } {
  const count = Number(row[4]) || 0

  const dueDay = Number(row[5]) || 1

  const startDate = normalizeSheetDate(row[6]) || getTodayIso()

  const planId = row[0] ?? ''

  return {
    rowNumber,
    id: planId,
    createdAt: row[1] ?? '',
    title: row[2] ?? '',
    amount: Number(row[3]) || 0,
    count,
    dueDay,
    startDate,
    note: row[7] ?? '',
    payments: parsePayments(planId, row[8] ?? '', count, dueDay, startDate, Number(row[3]) || 0)
  }
}

export function planToRow(plan: InstallmentPlan): string[] {
  return [
    plan.id,
    plan.createdAt,
    plan.title,
    String(plan.amount),
    String(plan.count),
    String(plan.dueDay),
    plan.startDate,
    plan.note,
    JSON.stringify(plan.payments)
  ]
}

export async function ensureInstallmentsSheet(spreadsheetId: string): Promise<void> {
  await ensureSheetWithHeaders(spreadsheetId, INSTALLMENTS_SHEET, INSTALLMENTS_HEADERS)
}

export async function fetchInstallmentPlans(
  spreadsheetId: string
): Promise<(InstallmentPlan & { rowNumber: number })[]> {
  const cached = installmentsCache.get(spreadsheetId)

  if (cached && Date.now() < cached.expiresAt) {
    return cached.plans.map(plan => ({
      ...plan,
      payments: plan.payments.map(payment => ({ ...payment }))
    }))
  }

  const rows = await fetchSheetRows(spreadsheetId, INSTALLMENTS_SHEET)

  const plans = rows
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(({ row }) => String(row[0] ?? '').trim())
    .map(({ row, rowNumber }) => rowToPlan(row, rowNumber))

  installmentsCache.set(spreadsheetId, {
    plans,
    expiresAt: Date.now() + INSTALLMENTS_CACHE_TTL_MS
  })

  return plans.map(plan => ({
    ...plan,
    payments: plan.payments.map(payment => ({ ...payment }))
  }))
}

export async function createInstallmentPlan(
  spreadsheetId: string,
  data: {
    title: string
    amount: number
    count: number
    dueDay: number
    startDate: string
    note: string
    paidUntil?: string
  }
): Promise<InstallmentPlan> {
  const plan: InstallmentPlan = {
    id: crypto.randomUUID(),
    createdAt: new Date().toLocaleString('fa-IR'),
    title: data.title,
    amount: data.amount,
    count: data.count,
    dueDay: data.dueDay,
    startDate: data.startDate,
    note: data.note,
    payments: buildPayments(
      data.count,
      data.dueDay,
      data.startDate,
      data.amount,
      data.paidUntil ?? ''
    )
  }

  await appendSheetRow(spreadsheetId, INSTALLMENTS_SHEET, planToRow(plan))
  invalidateInstallmentsCache(spreadsheetId)

  return plan
}

export async function updateInstallmentPlan(
  spreadsheetId: string,
  rowNumber: number,
  plan: InstallmentPlan
): Promise<void> {
  await updateSheetRow(spreadsheetId, INSTALLMENTS_SHEET, rowNumber, planToRow(plan))
  invalidateInstallmentsCache(spreadsheetId)
}

export async function deleteInstallmentPlan(
  spreadsheetId: string,
  rowNumber: number,
  plan?: InstallmentPlan
): Promise<void> {
  if (plan) {
    for (const payment of plan.payments) {
      if (payment.transactionRecordId) {
        await deleteLinkedExpenseRecord(spreadsheetId, payment.transactionRecordId)
      }
    }
  }
  await deleteSheetRow(spreadsheetId, INSTALLMENTS_SHEET, rowNumber)
  invalidateInstallmentsCache(spreadsheetId)
}

export async function toggleInstallmentPayment(
  spreadsheetId: string,
  plan: InstallmentPlan & { rowNumber: number },
  paymentIndex: number,
  paid: boolean
): Promise<InstallmentPlan> {
  const payment = plan.payments[paymentIndex]

  if (paid && !payment.paid) {
    const amount = getInstallmentPaymentAmount(payment, plan)

    const transactionRecordId = await createLinkedExpenseRecord(spreadsheetId, {
      title: `قسط: ${plan.title} (#${payment.n})`,
      amount,
      category: 'قسط',
      note: plan.note
    })

    const payments = plan.payments.map((p, index) => {
      if (index !== paymentIndex) return p

      return {
        ...p,
        paid: true,
        paidAt: getTodayIso(),
        transactionRecordId
      }
    })

    const updated: InstallmentPlan = { ...plan, payments }

    await updateInstallmentPlan(spreadsheetId, plan.rowNumber, updated)

    return updated
  }

  if (!paid && payment.paid) {
    if (payment.transactionRecordId) {
      await deleteLinkedExpenseRecord(spreadsheetId, payment.transactionRecordId)
    }

    const payments = plan.payments.map((p, index) => {
      if (index !== paymentIndex) return p

      return {
        ...p,
        paid: false,
        paidAt: '',
        transactionRecordId: undefined
      }
    })

    const updated: InstallmentPlan = { ...plan, payments }

    await updateInstallmentPlan(spreadsheetId, plan.rowNumber, updated)

    return updated
  }

  return plan
}

export async function updateInstallmentPaymentAmount(
  spreadsheetId: string,
  plan: InstallmentPlan & { rowNumber: number },
  paymentIndex: number,
  amount: number
): Promise<InstallmentPlan> {
  const payments = plan.payments.map((payment, index) => {
    if (index !== paymentIndex) return payment

    return { ...payment, amount }
  })

  const updated: InstallmentPlan = { ...plan, payments }

  await updateInstallmentPlan(spreadsheetId, plan.rowNumber, updated)

  return updated
}
