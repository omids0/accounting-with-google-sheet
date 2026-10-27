import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { updateSheetRow as UpdateSheetRow } from './sheets'
import type { Dang, Receivable } from '../types'

const mocks = vi.hoisted(() => ({
  api: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
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
  showError: mocks.error,
  showSuccess: vi.fn()
}))
vi.mock('../utils/sheetError', () => ({ handleSheetError: mocks.sheetError }))

const { dangToRow, fetchDangs } = await import('./dangRow')
const { findLinkedItems, recordChangeOf, syncLinkedOnRecordDeleted, syncLinkedOnRecordUpdated } =
  await import('./recordLinks')
const { fetchReceivables } = await import('./receivablesCrud')
const { RECEIVABLES_HEADERS, RECEIVABLES_SHEET, receivableToRow } = await import('./receivablesRow')
const { DANG_HEADERS } = await import('./sheetHeaders')
const { DANG_SHEET } = await import('./sheetNames')
const { clearStore, setSheetAllRows } = await import('./spreadsheetStore')
const { setWorkspaceType } = await import('./workspace')
const { isDangSettled } = await import('../utils/dangLedger')

const SHEET_ID = 'test-record-links'

const makeDang = (over: Partial<Dang> = {}): Dang => ({
  id: 'd1',
  createdAt: 't',
  title: 'خرید لامپ',
  category: 'خانه',
  counterparty: 'رضا',
  amount: 100_000,
  date: '2026-10-01',
  note: '',
  paid: false,
  paidAt: '',
  payments: [],
  ...over
})

const payment = (id: string, amount: number, record?: string) => ({
  id,
  amount,
  paidAt: '2026-10-05',
  note: '',
  ...(record ? { transactionRecordId: record } : {})
})

const makeReceivable = (over: Partial<Receivable> = {}): Receivable => ({
  id: 'r1',
  createdAt: 't',
  title: 'وام',
  debtor: 'علی',
  category: 'شخصی',
  amount: 100_000,
  borrowDate: '2026-10-01',
  note: '',
  payments: [],
  ...over
})

const seedDangs = (...items: Dang[]) =>
  setSheetAllRows(SHEET_ID, DANG_SHEET, [DANG_HEADERS, ...items.map(dangToRow)])

const seedReceivables = (...items: Receivable[]) =>
  setSheetAllRows(SHEET_ID, RECEIVABLES_SHEET, [RECEIVABLES_HEADERS, ...items.map(receivableToRow)])

beforeEach(() => {
  localStorage.clear()
  clearStore(SHEET_ID)
  Object.values(mocks).forEach(mock => {
    if (typeof mock === 'function') mock.mockReset()
  })
  mocks.updateFails = false
})

describe('a deleted record', () => {
  it('leaves its debt: the payment goes, others stay, settled turns open', async () => {
    seedDangs(
      makeDang({
        payments: [payment('p1', 40_000, 'rec-1'), payment('p2', 60_000, 'rec-2')]
      })
    )
    expect(isDangSettled((await fetchDangs(SHEET_ID))[0])).toBe(true)

    const notes = await syncLinkedOnRecordDeleted(SHEET_ID, 'rec-1', 'expense')

    const [dang] = await fetchDangs(SHEET_ID)

    expect(dang.payments.map(item => item.id)).toEqual(['p2'])
    expect(isDangSettled(dang)).toBe(false)
    expect(dang.paid).toBe(false)
    expect(dang.paidAt).toBe('')
    expect(dang.transactionRecordId).toBe('')
    expect(notes).toEqual(['پرداخت وصل‌شده به بدهی «خرید لامپ» هم برداشته شد.'])
    expect(mocks.info).toHaveBeenCalledTimes(1)
  })

  it('leaves its receivable (income records only)', async () => {
    seedReceivables(makeReceivable({ payments: [payment('p1', 100_000, 'rec-9')] }))

    await syncLinkedOnRecordDeleted(SHEET_ID, 'rec-9', 'expense')
    expect((await fetchReceivables(SHEET_ID))[0].payments).toHaveLength(1)

    await syncLinkedOnRecordDeleted(SHEET_ID, 'rec-9', 'income')
    expect((await fetchReceivables(SHEET_ID))[0].payments).toEqual([])
  })

  it('removes every payment of a record that fed several', async () => {
    seedDangs(
      makeDang({ payments: [payment('p1', 20_000, 'rec-1'), payment('p2', 30_000, 'rec-1')] })
    )

    await syncLinkedOnRecordDeleted(SHEET_ID, 'rec-1', 'expense')
    expect((await fetchDangs(SHEET_ID))[0].payments).toEqual([])
  })

  it('does nothing and reads nothing from the network when no item is linked', async () => {
    seedDangs(makeDang({ payments: [payment('p1', 40_000, 'other')] }))

    expect(await syncLinkedOnRecordDeleted(SHEET_ID, 'rec-1', 'expense')).toEqual([])
    expect((await fetchDangs(SHEET_ID))[0].payments).toHaveLength(1)
    expect(mocks.api).not.toHaveBeenCalled()
    expect(mocks.log).not.toHaveBeenCalled()
  })

  it('costs nothing when the debt and receivable tabs are not in the mirror', async () => {
    expect(await syncLinkedOnRecordDeleted(SHEET_ID, 'rec-1', 'expense')).toEqual([])
    expect(await syncLinkedOnRecordDeleted(SHEET_ID, 'rec-1', 'income')).toEqual([])
    expect(mocks.api).not.toHaveBeenCalled()
  })

  it('is skipped for a building and a shared account', async () => {
    seedDangs(makeDang({ payments: [payment('p1', 40_000, 'rec-1')] }))

    setWorkspaceType(SHEET_ID, 'building')
    await syncLinkedOnRecordDeleted(SHEET_ID, 'rec-1', 'expense')
    setWorkspaceType(SHEET_ID, 'shared')
    await syncLinkedOnRecordDeleted(SHEET_ID, 'rec-1', 'expense')

    expect((await fetchDangs(SHEET_ID))[0].payments).toHaveLength(1)
    expect(findLinkedItems(SHEET_ID, 'rec-1', 'expense')).toEqual([])
  })

  it('reports a failure without throwing, so the record delete still stands', async () => {
    seedDangs(makeDang({ payments: [payment('p1', 40_000, 'rec-1')] }))
    mocks.updateFails = true

    await expect(syncLinkedOnRecordDeleted(SHEET_ID, 'rec-1', 'expense')).resolves.toEqual([])
    expect(mocks.sheetError).toHaveBeenCalledTimes(1)
    expect(mocks.sheetError.mock.calls[0][1]).toEqual({
      fallbackMessage: 'تراکنش حذف شد ولی پرداخت بدهی به‌روز نشد'
    })
  })
})

describe('an edited record', () => {
  const edit = (before: Record<string, string>, after: Record<string, string>) =>
    syncLinkedOnRecordUpdated(SHEET_ID, 'rec-1', 'expense', before, after)

  it('moves the single payment to the new amount and date', async () => {
    seedDangs(makeDang({ payments: [payment('p1', 40_000, 'rec-1')] }))

    const notes = await edit(
      { amount: '40000', date: '2026-10-05' },
      { amount: '55,000', date: '2026-10-07' }
    )

    const [dang] = await fetchDangs(SHEET_ID)

    expect(dang.payments[0]).toMatchObject({ amount: 55_000, paidAt: '2026-10-07' })
    expect(notes).toEqual([])
    expect(mocks.info).not.toHaveBeenCalled()
  })

  it('syncs a receivable from an income record', async () => {
    seedReceivables(makeReceivable({ payments: [payment('p1', 40_000, 'rec-1')] }))

    await syncLinkedOnRecordUpdated(
      SHEET_ID,
      'rec-1',
      'income',
      { amount: '40000' },
      { amount: '90000' }
    )
    expect((await fetchReceivables(SHEET_ID))[0].payments[0].amount).toBe(90_000)
  })

  it('warns when the payments now exceed the debt, and the remaining stays at zero', async () => {
    seedDangs(makeDang({ payments: [payment('p1', 40_000, 'rec-1')] }))

    const notes = await edit({ amount: '40000' }, { amount: '150000' })

    const [dang] = await fetchDangs(SHEET_ID)

    expect(dang.payments[0].amount).toBe(150_000)
    expect(isDangSettled(dang)).toBe(true)
    expect(notes).toEqual([
      'مجموع پرداخت‌های بدهی «خرید لامپ» از مبلغ بدهی بیشتر شد؛ باقی‌مانده صفر نمایش داده می‌شود.'
    ])
    expect(mocks.info).toHaveBeenCalledWith(notes[0], expect.any(Number))
  })

  it('leaves the payments of a record that feeds several and warns', async () => {
    seedDangs(
      makeDang({ payments: [payment('p1', 20_000, 'rec-1'), payment('p2', 30_000, 'rec-1')] })
    )

    const notes = await edit({ amount: '50000' }, { amount: '80000' })

    expect((await fetchDangs(SHEET_ID))[0].payments.map(item => item.amount)).toEqual([
      20_000, 30_000
    ])
    expect(notes).toEqual([
      'مبلغ این تراکنش بین چند پرداخت بدهی «خرید لامپ» تقسیم شده است؛ تقسیم را خودتان اصلاح کنید.'
    ])
  })

  it('ignores a category move: no change to amount or date, and the link stays', async () => {
    seedDangs(makeDang({ payments: [payment('p1', 40_000, 'rec-1')] }))

    const notes = await edit(
      { amount: '40000', date: '2026-10-05', category: 'بدهی' },
      { amount: '40000', date: '2026-10-05', category: 'خوراک' }
    )

    expect(notes).toEqual([])
    expect(mocks.api).not.toHaveBeenCalled()
    expect(findLinkedItems(SHEET_ID, 'rec-1', 'expense')).toHaveLength(1)
  })

  it('reports a failure without throwing', async () => {
    seedDangs(makeDang({ payments: [payment('p1', 40_000, 'rec-1')] }))
    mocks.updateFails = true

    await expect(edit({ amount: '40000' }, { amount: '50000' })).resolves.toEqual([])
    expect(mocks.sheetError).toHaveBeenCalledTimes(1)
  })

  it('is skipped in a building', async () => {
    seedDangs(makeDang({ payments: [payment('p1', 40_000, 'rec-1')] }))
    setWorkspaceType(SHEET_ID, 'building')

    await edit({ amount: '40000' }, { amount: '50000' })
    expect((await fetchDangs(SHEET_ID))[0].payments[0].amount).toBe(40_000)
  })
})

describe('recordChangeOf', () => {
  it('names only what changed and ignores an empty or zero amount', () => {
    expect(recordChangeOf({ amount: '10', date: 'a' }, { amount: '10', date: 'a' })).toEqual({})
    expect(recordChangeOf({ amount: '10' }, { amount: '' })).toEqual({})
    expect(recordChangeOf({ amount: '10' }, { amount: '۲۰' })).toEqual({ amount: 20 })
    expect(recordChangeOf({ date: 'a' }, { date: 'b' })).toEqual({ date: 'b' })
  })
})

describe('findLinkedItems', () => {
  it('names the debt and the receivable a record is the payment of', () => {
    seedDangs(makeDang({ payments: [payment('p1', 40_000, 'rec-1')] }))
    seedReceivables(makeReceivable({ payments: [payment('p1', 40_000, 'rec-2')] }))

    expect(findLinkedItems(SHEET_ID, 'rec-1', 'expense')).toMatchObject([
      { kind: 'dang', noun: 'بدهی', title: 'خرید لامپ', paymentIds: ['p1'] }
    ])
    expect(findLinkedItems(SHEET_ID, 'rec-2', 'income')).toMatchObject([
      { kind: 'receivables', noun: 'طلب', title: 'وام' }
    ])
    expect(findLinkedItems(SHEET_ID, 'rec-2', 'expense')).toEqual([])
  })
})
