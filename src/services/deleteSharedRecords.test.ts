import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Dang, Receivable } from '../types'

const mocks = vi.hoisted(() => ({
  deleteExpense: vi.fn(),
  deleteIncome: vi.fn(),
  deleteRow: vi.fn()
}))

vi.mock('./sheetSync', () => ({ enqueueSheetWrite: vi.fn(), queueOutboxWrite: vi.fn() }))
vi.mock('./activityLog', () => ({ logActivity: vi.fn(), logItemActivity: vi.fn() }))
vi.mock('./freshRow', () => ({ refreshRowFromSheet: vi.fn(async () => 'ok') }))
vi.mock('./paymentTransactions', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  deleteLinkedExpenseRecord: mocks.deleteExpense,
  deleteLinkedIncomeRecord: mocks.deleteIncome
}))
vi.mock('./sheets', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  deleteSheetRow: mocks.deleteRow
}))

const { dangToRow } = await import('./dangRow')
const { deleteDang } = await import('./dang')
const { deleteReceivable } = await import('./receivablesCrud')
const { RECEIVABLES_HEADERS, RECEIVABLES_SHEET, receivableToRow } = await import('./receivablesRow')
const { DANG_HEADERS } = await import('./sheetHeaders')
const { DANG_SHEET } = await import('./sheetNames')
const { clearStore, setSheetAllRows } = await import('./spreadsheetStore')

const SHEET_ID = 'test-delete-shared'

const payment = (id: string, amount: number, record: string) => ({
  id,
  amount,
  paidAt: '2026-10-05',
  note: '',
  transactionRecordId: record
})

const dang = (id: string, payments: Dang['payments']): Dang => ({
  id,
  createdAt: 't',
  title: id,
  category: 'خانه',
  counterparty: 'رضا',
  amount: 100_000,
  date: '2026-10-01',
  note: '',
  paid: false,
  paidAt: '',
  payments
})

const receivable = (id: string, payments: Receivable['payments']): Receivable => ({
  id,
  createdAt: 't',
  title: id,
  debtor: 'علی',
  category: 'شخصی',
  amount: 100_000,
  borrowDate: '2026-10-01',
  note: '',
  payments
})

beforeEach(() => {
  localStorage.clear()
  clearStore(SHEET_ID)
  Object.values(mocks).forEach(mock => mock.mockReset())
})

describe('deleting a debt together with its related records', () => {
  it('deletes the record only this debt used, and keeps one another debt also pays', async () => {
    const a = dang('a', [payment('p1', 40_000, 'shared'), payment('p2', 10_000, 'own')])

    setSheetAllRows(SHEET_ID, DANG_SHEET, [
      DANG_HEADERS,
      dangToRow(a),
      dangToRow(dang('b', [payment('p3', 60_000, 'shared')]))
    ])

    await deleteDang(SHEET_ID, 2, a)

    expect(mocks.deleteExpense.mock.calls.map(call => call[1])).toEqual(['own'])
    expect(mocks.deleteRow).toHaveBeenCalledTimes(1)
  })
})

describe('deleting a receivable together with its related records', () => {
  it('deletes the record only this receivable used, and keeps one another also takes', async () => {
    const a = receivable('a', [payment('p1', 40_000, 'shared'), payment('p2', 10_000, 'own')])

    setSheetAllRows(SHEET_ID, RECEIVABLES_SHEET, [
      RECEIVABLES_HEADERS,
      receivableToRow(a),
      receivableToRow(receivable('b', [payment('p3', 60_000, 'shared')]))
    ])

    await deleteReceivable(SHEET_ID, 2, a)

    expect(mocks.deleteIncome.mock.calls.map(call => call[1])).toEqual(['own'])
    expect(mocks.deleteRow).toHaveBeenCalledTimes(1)
  })
})
