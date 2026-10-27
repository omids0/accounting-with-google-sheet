import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { LedgerEntry } from './recordDuplicates'
import type { Check, Dang, InstallmentPlan } from '../types'
import { buildPayments } from './installmentsSchedule'
import { getTodayIso } from '../utils/jalaliDate'

vi.mock('./sheetSync', () => ({ enqueueSheetWrite: vi.fn(), queueOutboxWrite: vi.fn() }))
vi.mock('./bankSmsApply', () => ({ SMS_RECORD_NOTE: 'ثبت از پیامک' }))

const { dangToRow } = await import('./dangRow')
const { checkToRow } = await import('./checkRows')
const { CHECK_DIRECTION_COLUMN } = await import('./checkDirection')
const { CHECKS_HEADERS, CHECKS_SHEET } = await import('./checks')
const { INSTALLMENTS_HEADERS, INSTALLMENTS_SHEET, invalidateInstallmentsCache } = await import(
  './installmentsConstants'
)
const { planToRow } = await import('./installmentsCrud')
const { isRecordLinked } = await import('./recordLinks')
const { DANG_HEADERS } = await import('./sheetHeaders')
const { DANG_SHEET } = await import('./sheetNames')
const { findSettleDuplicate } = await import('./settleDuplicates')
const { clearStore, setSheetAllRows } = await import('./spreadsheetStore')
const { setWorkspaceType } = await import('./workspace')

const SHEET_ID = 'test-settle-cross-module'
const today = getTodayIso()
const candidate = { type: 'expense' as const, amount: 1_000_000, date: today }

const record = (id: string): LedgerEntry => ({
  type: 'expense',
  amount: 1_000_000,
  date: today,
  accountId: 'acc-1',
  id,
  title: 'برداشت',
  createdAtMs: 1_000
})

const plan: InstallmentPlan = {
  id: 'p1',
  createdAt: 't',
  title: 'وام',
  amount: 1_000_000,
  count: 2,
  dueDay: 5,
  startDate: '2026-07-20',
  note: '',
  subCategory: '',
  payments: buildPayments(2, 5, '2026-07-20', 1_000_000).map(payment =>
    payment.n === 1
      ? { ...payment, paid: true, paidAt: today, transactionRecordId: 'rec-inst' }
      : payment
  )
}

const check: Check = {
  id: 'c1',
  createdAt: 't',
  checkNumber: '1001',
  direction: 'paid',
  counterparty: 'علی',
  amount: 1_000_000,
  creationDate: '2026-10-01',
  dueDate: '2026-10-20',
  paid: true,
  paidAt: today,
  transactionRecordId: 'rec-check',
  subCategory: ''
}

const dang: Dang = {
  id: 'd1',
  createdAt: 't',
  title: 'لامپ',
  category: 'خانه',
  counterparty: 'رضا',
  amount: 1_000_000,
  date: today,
  note: '',
  paid: false,
  paidAt: '',
  payments: [{ id: 'pay1', amount: 1_000_000, paidAt: today, transactionRecordId: 'rec-dang' }]
} as unknown as Dang

beforeEach(() => {
  localStorage.clear()
  clearStore(SHEET_ID)
  invalidateInstallmentsCache(SHEET_ID)
  setWorkspaceType(SHEET_ID, 'personal')
  setSheetAllRows(SHEET_ID, INSTALLMENTS_SHEET, [INSTALLMENTS_HEADERS, planToRow(plan)])
  setSheetAllRows(SHEET_ID, CHECKS_SHEET, [
    CHECKS_HEADERS,
    checkToRow(check, CHECK_DIRECTION_COLUMN)
  ])
  setSheetAllRows(SHEET_ID, DANG_SHEET, [DANG_HEADERS, dangToRow(dang)])
})

describe('isRecordLinked', () => {
  it('is true for a record any module points at', () => {
    expect(isRecordLinked(SHEET_ID, 'rec-inst', 'expense')).toBe(true)
    expect(isRecordLinked(SHEET_ID, 'rec-check', 'expense')).toBe(true)
    expect(isRecordLinked(SHEET_ID, 'rec-dang', 'expense')).toBe(true)
    expect(isRecordLinked(SHEET_ID, 'rec-free', 'expense')).toBe(false)
  })

  it('is false in a building, which keeps its own rules', () => {
    setWorkspaceType(SHEET_ID, 'building')
    expect(isRecordLinked(SHEET_ID, 'rec-inst', 'expense')).toBe(false)
  })
})

describe('the settle duplicate across modules', () => {
  const isLinked = (entry: LedgerEntry) =>
    Boolean(entry.id) && isRecordLinked(SHEET_ID, entry.id as string, entry.type)

  it('does not offer a record that is linked to an installment, check or debt payment', () => {
    for (const id of ['rec-inst', 'rec-check', 'rec-dang']) {
      // The module being settled knows none of them; only the cross-module check can skip them.
      expect(findSettleDuplicate(candidate, [record(id)], new Set(), isLinked)).toBeNull()
    }
  })

  it('still offers a genuinely unlinked record of the same amount', () => {
    const ledger = [record('rec-inst'), record('rec-free')]

    expect(findSettleDuplicate(candidate, ledger, new Set(), isLinked)?.id).toBe('rec-free')
  })

  it('offers the linked record when no cross-module check is given (old behaviour)', () => {
    expect(findSettleDuplicate(candidate, [record('rec-inst')], new Set())?.id).toBe('rec-inst')
  })
})
