import type { InstallmentPayment, InstallmentPlan } from '../types'
import {
  INSTALLMENTS_CACHE_TTL_MS,
  INSTALLMENT_EXPENSE_CATEGORY,
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
import { getSheetDataRows } from './spreadsheetStore'
import { getTodayIso } from '../utils/jalaliDate'
import { normalizeSheetDate } from '../utils/sheetValues'

type PlanWithRowNumber = InstallmentPlan & { rowNumber: number }

function rowToPlan(row: string[], rowNumber: number, spreadsheetId: string): PlanWithRowNumber {
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
    subCategory: row[9] ?? '',
    payments: parsePayments(
      planId,
      row[8] ?? '',
      count,
      dueDay,
      startDate,
      Number(row[3]) || 0,
      spreadsheetId
    )
  }
}

/**
 * Latest saved copy of a plan from the local spreadsheet store. Read synchronously
 * right before a write so concurrent mutations never rebuild from a stale snapshot.
 */
function readLatestPlan(spreadsheetId: string, plan: PlanWithRowNumber): PlanWithRowNumber {
  const rows = getSheetDataRows(spreadsheetId, INSTALLMENTS_SHEET)

  const index = rows ? rows.findIndex(row => row[0] === plan.id) : -1

  if (!rows || index < 0) return plan

  return rowToPlan(rows[index], index + 2, spreadsheetId)
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
    JSON.stringify(plan.payments),
    plan.subCategory ?? ''
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
    .map(({ row, rowNumber }) => rowToPlan(row, rowNumber, spreadsheetId))

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
    subCategory?: string
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
    subCategory: data.subCategory ?? '',
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

/**
 * Patch one payment on the latest stored copy of the plan and save it. The read and
 * the store write happen in the same tick, so overlapping mutations cannot drop
 * each other's changes.
 */
async function savePaymentPatch(
  spreadsheetId: string,
  plan: PlanWithRowNumber,
  paymentIndex: number,
  patch: Partial<InstallmentPayment>
): Promise<PlanWithRowNumber> {
  const latest = readLatestPlan(spreadsheetId, plan)

  const payments = latest.payments.map((payment, index) =>
    index === paymentIndex ? { ...payment, ...patch } : payment
  )

  const updated: PlanWithRowNumber = { ...latest, payments }

  await updateInstallmentPlan(spreadsheetId, latest.rowNumber, updated)

  return updated
}

export async function toggleInstallmentPayment(
  spreadsheetId: string,
  plan: PlanWithRowNumber,
  paymentIndex: number,
  paid: boolean
): Promise<PlanWithRowNumber> {
  const current = readLatestPlan(spreadsheetId, plan)

  const payment = current.payments[paymentIndex]

  if (!payment) return current

  if (paid && !payment.paid) {
    const transactionRecordId = await createLinkedExpenseRecord(spreadsheetId, {
      title: `قسط: ${current.title} (#${payment.n})`,
      amount: getInstallmentPaymentAmount(payment, current),
      category: INSTALLMENT_EXPENSE_CATEGORY,
      subCategory: current.subCategory,
      note: current.note
    })

    return savePaymentPatch(spreadsheetId, current, paymentIndex, {
      paid: true,
      paidAt: getTodayIso(),
      transactionRecordId
    })
  }

  if (!paid && payment.paid) {
    if (payment.transactionRecordId) {
      await deleteLinkedExpenseRecord(spreadsheetId, payment.transactionRecordId)
    }

    return savePaymentPatch(spreadsheetId, current, paymentIndex, {
      paid: false,
      paidAt: '',
      transactionRecordId: undefined
    })
  }

  return current
}

export async function updateInstallmentPaymentAmount(
  spreadsheetId: string,
  plan: PlanWithRowNumber,
  paymentIndex: number,
  amount: number
): Promise<PlanWithRowNumber> {
  return savePaymentPatch(spreadsheetId, plan, paymentIndex, { amount })
}
