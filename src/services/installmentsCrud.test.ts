import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { InstallmentPayment, InstallmentPlan } from '../types'
import {
  INSTALLMENTS_HEADERS,
  INSTALLMENTS_SHEET,
  MAX_INSTALLMENT_COUNT,
  invalidateInstallmentsCache,
  paymentScheduleCache
} from './installmentsConstants'
import {
  planToRow,
  toggleInstallmentPayment,
  updateInstallmentPaymentAmount
} from './installmentsCrud'
import { buildPayments, parsePayments } from './installmentsSchedule'
import { createLinkedExpenseRecord } from './paymentTransactions'
import { clearStore, getSheetDataRows, setSheetAllRows } from './spreadsheetStore'
import { requiredPositiveInteger } from '../utils/formValidation'

vi.mock('./sheetSync', () => ({
  enqueueSheetWrite: vi.fn(),
  queueOutboxWrite: vi.fn()
}))

vi.mock('./paymentTransactions', () => ({
  createLinkedExpenseRecord: vi.fn(),
  deleteLinkedExpenseRecord: vi.fn().mockResolvedValue(undefined)
}))

const SHEET_ID = 'test-installments-sheet'

const START = '2024-08-05'

function makePlan(): InstallmentPlan & { rowNumber: number } {
  return {
    rowNumber: 2,
    id: 'plan-1',
    createdAt: '2024-08-01',
    title: 'وام',
    amount: 1_000,
    count: 3,
    dueDay: 15,
    startDate: START,
    note: '',
    subCategory: '',
    payments: buildPayments(3, 15, START, 1_000)
  }
}

function storedPayments(): InstallmentPayment[] {
  const rows = getSheetDataRows(SHEET_ID, INSTALLMENTS_SHEET) ?? []

  return JSON.parse(rows[0][8]) as InstallmentPayment[]
}

function deferred<T>() {
  let resolve!: (value: T) => void

  const promise = new Promise<T>(res => {
    resolve = res
  })

  return { promise, resolve }
}

describe('toggleInstallmentPayment concurrency', () => {
  beforeEach(() => {
    localStorage.clear()
    clearStore(SHEET_ID)
    invalidateInstallmentsCache()
    setSheetAllRows(SHEET_ID, INSTALLMENTS_SHEET, [INSTALLMENTS_HEADERS, planToRow(makePlan())])
  })

  it('keeps both payments when two toggles overlap on a stale plan', async () => {
    const stalePlan = makePlan()

    const first = deferred<string>()

    const second = deferred<string>()

    vi.mocked(createLinkedExpenseRecord)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)

    const toggleFirst = toggleInstallmentPayment(SHEET_ID, stalePlan, 0, true)

    const toggleSecond = toggleInstallmentPayment(SHEET_ID, stalePlan, 1, true)

    first.resolve('tx-1')
    await toggleFirst
    second.resolve('tx-2')

    const result = await toggleSecond

    const payments = storedPayments()

    expect(payments.map(p => p.paid)).toEqual([true, true, false])
    expect(payments.map(p => p.transactionRecordId)).toEqual(['tx-1', 'tx-2', undefined])
    expect(result.payments.map(p => p.paid)).toEqual([true, true, false])
  })

  it('does not drop a paid toggle when a stale amount edit follows', async () => {
    const stalePlan = makePlan()

    vi.mocked(createLinkedExpenseRecord).mockResolvedValueOnce('tx-1')

    await toggleInstallmentPayment(SHEET_ID, stalePlan, 0, true)
    await updateInstallmentPaymentAmount(SHEET_ID, stalePlan, 2, 2_500)

    const payments = storedPayments()

    expect(payments[0]).toMatchObject({ paid: true, transactionRecordId: 'tx-1' })
    expect(payments[2].amount).toBe(2_500)
  })
})

describe('payment schedule cache invalidation', () => {
  it('drops only the invalidated spreadsheet entries', () => {
    paymentScheduleCache.clear()

    const raw = JSON.stringify(buildPayments(3, 15, START, 1_000))

    parsePayments('plan-1', raw, 3, 15, START, 1_000, 'sheet-a')
    parsePayments('plan-1', raw, 3, 15, START, 1_000, 'sheet-b')

    expect(paymentScheduleCache.size).toBe(2)

    invalidateInstallmentsCache('sheet-a')

    const keys = [...paymentScheduleCache.keys()]

    expect(keys).toHaveLength(1)
    expect(keys[0].startsWith('sheet-b:')).toBe(true)
  })
})

describe('installment count limit', () => {
  const rule = requiredPositiveInteger('تعداد بازپرداخت', 1, MAX_INSTALLMENT_COUNT)

  it('rejects counts above the maximum with a Persian message', () => {
    expect(rule.validate(MAX_INSTALLMENT_COUNT)).toBe(true)
    expect(rule.validate(MAX_INSTALLMENT_COUNT + 1)).toBe(
      `تعداد بازپرداخت باید بین 1 تا ${MAX_INSTALLMENT_COUNT} باشد`
    )
  })

  it('keeps a fully paid maximum-size schedule under the 50k cell limit', () => {
    const payments = buildPayments(MAX_INSTALLMENT_COUNT, 31, START, 999_999_999_999).map(
      payment => ({
        ...payment,
        paid: true,
        paidAt: payment.dueDate,
        transactionRecordId: crypto.randomUUID()
      })
    )

    expect(JSON.stringify(payments).length).toBeLessThan(50_000)
  })
})
