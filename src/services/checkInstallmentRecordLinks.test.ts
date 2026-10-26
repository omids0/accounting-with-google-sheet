import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { updateSheetRow as UpdateSheetRow } from './sheets'
import type { Check, InstallmentPlan } from '../types'
import { buildPayments } from './installmentsSchedule'

const mocks = vi.hoisted(() => ({
  api: vi.fn(),
  info: vi.fn(),
  sheetError: vi.fn(),
  log: vi.fn(),
  updateFails: false
}))

vi.mock('./sheetSync', () => ({ enqueueSheetWrite: vi.fn(), queueOutboxWrite: vi.fn() }))
vi.mock('./sheetsApi', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  apiRequest: mocks.api
}))
vi.mock('./sheets', async importOriginal => {
  const original = await importOriginal<{ updateSheetRow: typeof UpdateSheetRow }>()

  return {
    ...original,
    updateSheetRow: (...args: Parameters<typeof UpdateSheetRow>) => {
      if (mocks.updateFails) return Promise.reject(new Error('boom'))

      return original.updateSheetRow(...args)
    }
  }
})
vi.mock('./activityLog', () => ({ logActivity: mocks.log, logItemActivity: mocks.log }))
vi.mock('../utils/toast', () => ({
  showInfo: mocks.info,
  showError: vi.fn(),
  showSuccess: vi.fn()
}))
vi.mock('../utils/sheetError', () => ({ handleSheetError: mocks.sheetError }))

const { CHECK_DIRECTION_COLUMN } = await import('./checkDirection')
const { checkToRow } = await import('./checkRows')
const { CHECKS_HEADERS, CHECKS_SHEET, fetchChecks } = await import('./checks')
const { INSTALLMENTS_HEADERS, INSTALLMENTS_SHEET, invalidateInstallmentsCache } = await import(
  './installmentsConstants'
)
const { fetchInstallmentPlans, planToRow } = await import('./installmentsCrud')
const { findLinkedItems, syncLinkedOnRecordDeleted, syncLinkedOnRecordUpdated } = await import(
  './recordLinks'
)
const { clearStore, setSheetAllRows } = await import('./spreadsheetStore')
const { setWorkspaceType } = await import('./workspace')

const SHEET_ID = 'test-check-installment-links'

const makeCheck = (over: Partial<Check> = {}): Check => ({
  id: 'c1',
  createdAt: 't',
  checkNumber: '123',
  direction: 'paid',
  counterparty: 'علی',
  amount: 5_000_000,
  creationDate: '2026-10-01',
  dueDate: '2026-10-20',
  paid: true,
  paidAt: '2026-10-05',
  transactionRecordId: 'rec-1',
  subCategory: '',
  ...over
})

const seedChecks = (...items: Check[]) =>
  setSheetAllRows(SHEET_ID, CHECKS_SHEET, [
    CHECKS_HEADERS,
    ...items.map(item => checkToRow(item, CHECK_DIRECTION_COLUMN))
  ])

const makePlan = (over: Partial<InstallmentPlan> = {}): InstallmentPlan => ({
  id: 'p1',
  createdAt: 't',
  title: 'وام خودرو',
  amount: 1_000_000,
  count: 3,
  dueDay: 5,
  startDate: '2026-07-20',
  note: '',
  subCategory: '',
  // Instalments 1 and 2 are paid, 2 with the record «rec-1»; 3 is open.
  payments: buildPayments(3, 5, '2026-07-20', 1_000_000).map(payment =>
    payment.n === 1
      ? { ...payment, paid: true, paidAt: '2026-08-05' }
      : payment.n === 2
      ? { ...payment, paid: true, paidAt: '2026-09-07', transactionRecordId: 'rec-1' }
      : payment
  ),
  ...over
})

const seedPlans = (...items: InstallmentPlan[]) =>
  setSheetAllRows(SHEET_ID, INSTALLMENTS_SHEET, [INSTALLMENTS_HEADERS, ...items.map(planToRow)])

beforeEach(() => {
  localStorage.clear()
  clearStore(SHEET_ID)
  invalidateInstallmentsCache(SHEET_ID)
  Object.values(mocks).forEach(mock => {
    if (typeof mock === 'function') mock.mockReset()
  })
  mocks.updateFails = false
})

describe('a deleted record that paid a check', () => {
  it('reopens the check (expense for a given check)', async () => {
    seedChecks(makeCheck())

    const notes = await syncLinkedOnRecordDeleted(SHEET_ID, 'rec-1', 'expense')

    const [check] = await fetchChecks(SHEET_ID)

    expect(check).toMatchObject({ paid: false, paidAt: '', transactionRecordId: '' })
    expect(check.amount).toBe(5_000_000)
    expect(notes).toHaveLength(1)
    expect(notes[0]).toContain('دوباره پاس‌نشده')
    expect(mocks.info).toHaveBeenCalledTimes(1)
  })

  it('reopens a received check when its income record is deleted', async () => {
    seedChecks(makeCheck({ direction: 'received' }))

    await syncLinkedOnRecordDeleted(SHEET_ID, 'other', 'income')
    expect((await fetchChecks(SHEET_ID))[0].paid).toBe(true)
    await syncLinkedOnRecordDeleted(SHEET_ID, 'rec-1', 'income')
    expect((await fetchChecks(SHEET_ID))[0]).toMatchObject({ paid: false, direction: 'received' })
    expect(findLinkedItems(SHEET_ID, 'rec-1', 'income')).toEqual([])
  })

  it('leaves other checks alone', async () => {
    seedChecks(makeCheck(), makeCheck({ id: 'c2', transactionRecordId: 'rec-2' }))
    await syncLinkedOnRecordDeleted(SHEET_ID, 'rec-1', 'expense')

    const [first, second] = await fetchChecks(SHEET_ID)

    expect([first.paid, second.paid].sort()).toEqual([false, true])
    expect(second.transactionRecordId).toBe('rec-2')
  })

  it('is listed on the record as «وصل به چک»', () => {
    seedChecks(makeCheck())

    const items = findLinkedItems(SHEET_ID, 'rec-1', 'expense')

    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ kind: 'checks', noun: 'چک', itemId: 'c1' })
    expect(items[0].title).toContain('چک پرداختی')
  })

  it('costs nothing when no check is linked, and skips a building', async () => {
    expect(await syncLinkedOnRecordDeleted(SHEET_ID, 'rec-1', 'expense')).toEqual([])
    seedChecks(makeCheck())
    setWorkspaceType(SHEET_ID, 'building')
    await syncLinkedOnRecordDeleted(SHEET_ID, 'rec-1', 'expense')
    setWorkspaceType(SHEET_ID, 'shared')
    await syncLinkedOnRecordDeleted(SHEET_ID, 'rec-1', 'expense')
    expect((await fetchChecks(SHEET_ID))[0].paid).toBe(true)
    expect(mocks.api).not.toHaveBeenCalled()
  })

  it('reports a failure without throwing, so the record delete still stands', async () => {
    seedChecks(makeCheck())
    mocks.updateFails = true

    await expect(syncLinkedOnRecordDeleted(SHEET_ID, 'rec-1', 'expense')).resolves.toEqual([])
    expect(mocks.sheetError).toHaveBeenCalledTimes(1)
    expect(mocks.sheetError.mock.calls[0][1]).toEqual({
      fallbackMessage: 'تراکنش حذف شد ولی پرداخت چک به‌روز نشد'
    })
  })
})

describe('an edited record that paid a check', () => {
  const edit = (before: Record<string, string>, after: Record<string, string>) =>
    syncLinkedOnRecordUpdated(SHEET_ID, 'rec-1', 'expense', before, after)

  it('moves the date the check was passed', async () => {
    seedChecks(makeCheck())

    const notes = await edit({ date: '2026-10-05' }, { date: '2026-10-08' })

    expect((await fetchChecks(SHEET_ID))[0]).toMatchObject({ paid: true, paidAt: '2026-10-08' })
    expect(notes).toEqual([])
  })

  it('keeps the fixed check amount and says the amounts no longer match', async () => {
    seedChecks(makeCheck())

    const notes = await edit({ amount: '5000000' }, { amount: '4,000,000' })

    expect((await fetchChecks(SHEET_ID))[0].amount).toBe(5_000_000)
    expect(notes).toHaveLength(1)
    expect(notes[0]).toContain('مبلغ چک عوض نشد')
  })

  it('says nothing when the new amount is still the check amount', async () => {
    seedChecks(makeCheck())
    expect(await edit({ amount: '4000000' }, { amount: '5000000' })).toEqual([])
  })
})

describe('a deleted record that paid an installment', () => {
  it('makes only that instalment unpaid again', async () => {
    seedPlans(makePlan())

    const notes = await syncLinkedOnRecordDeleted(SHEET_ID, 'rec-1', 'expense')

    const [plan] = await fetchInstallmentPlans(SHEET_ID)

    expect(plan.payments.map(payment => payment.paid)).toEqual([true, false, false])
    expect(plan.payments[1]).toMatchObject({ paidAt: '' })
    expect(plan.payments[1].transactionRecordId).toBeUndefined()
    expect(plan.payments[1].amount).toBe(1_000_000)
    expect(notes).toHaveLength(1)
    expect(notes[0]).toContain('قسط ۲')
  })

  it('is listed on the record with the book and the number', () => {
    seedPlans(makePlan())

    const items = findLinkedItems(SHEET_ID, 'rec-1', 'expense')

    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ kind: 'installments', noun: 'قسط', paymentIds: ['2'] })
    expect(items[0].title).toBe('وام خودرو، قسط ۲')
    expect(findLinkedItems(SHEET_ID, 'rec-1', 'income')).toEqual([])
  })

  it('leaves other books alone and skips a building', async () => {
    seedPlans(makePlan(), makePlan({ id: 'p2', title: 'وام دیگر' }))
    setWorkspaceType(SHEET_ID, 'building')
    await syncLinkedOnRecordDeleted(SHEET_ID, 'rec-1', 'expense')
    expect((await fetchInstallmentPlans(SHEET_ID))[0].payments[1].paid).toBe(true)
  })

  it('reports a failure without throwing', async () => {
    seedPlans(makePlan())
    mocks.updateFails = true

    await expect(syncLinkedOnRecordDeleted(SHEET_ID, 'rec-1', 'expense')).resolves.toEqual([])
    expect(mocks.sheetError.mock.calls[0][1]).toEqual({
      fallbackMessage: 'تراکنش حذف شد ولی پرداخت قسط به‌روز نشد'
    })
  })
})

describe('an edited record that paid an installment', () => {
  const edit = (before: Record<string, string>, after: Record<string, string>) =>
    syncLinkedOnRecordUpdated(SHEET_ID, 'rec-1', 'expense', before, after)

  it('moves the paid date and keeps the instalment amount', async () => {
    seedPlans(makePlan())

    const notes = await edit(
      { amount: '1000000', date: '2026-09-07' },
      { amount: '1050000', date: '2026-09-09' }
    )

    const [plan] = await fetchInstallmentPlans(SHEET_ID)

    expect(plan.payments[1]).toMatchObject({ paid: true, paidAt: '2026-09-09', amount: 1_000_000 })
    expect(notes).toHaveLength(1)
    expect(notes[0]).toContain('مبلغ قسط عوض نشد')
  })

  it('writes nothing when neither the date nor a different amount changed', async () => {
    seedPlans(makePlan())
    mocks.log.mockClear()
    expect(await edit({ date: '2026-09-07' }, { date: '2026-09-07' })).toEqual([])
    expect(mocks.log).not.toHaveBeenCalled()
  })

  it('says nothing when the amount edit makes it equal to the instalment again', async () => {
    seedPlans(makePlan())
    expect(await edit({ amount: '1050000' }, { amount: '1000000' })).toEqual([])
  })
})
