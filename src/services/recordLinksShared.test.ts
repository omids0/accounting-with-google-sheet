import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Dang } from '../types'

const mocks = vi.hoisted(() => ({ api: vi.fn(), info: vi.fn() }))

vi.mock('./sheetSync', () => ({ enqueueSheetWrite: vi.fn(), queueOutboxWrite: vi.fn() }))
vi.mock('./sheetsApi', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  apiRequest: mocks.api
}))
vi.mock('./activityLog', () => ({ logActivity: vi.fn(), logItemActivity: vi.fn() }))
vi.mock('../utils/toast', () => ({
  showInfo: mocks.info,
  showError: vi.fn(),
  showSuccess: vi.fn()
}))
vi.mock('../utils/sheetError', () => ({ handleSheetError: vi.fn() }))

const { dangToRow, fetchDangs } = await import('./dangRow')
const { isRecordSharedElsewhere, sharedAmountLockMessage, syncLinkedOnRecordUpdated } =
  await import('./recordLinks')
const { DANG_HEADERS } = await import('./sheetHeaders')
const { DANG_SHEET } = await import('./sheetNames')
const { clearStore, setSheetAllRows } = await import('./spreadsheetStore')

const SHEET_ID = 'test-record-links-shared'

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

const seedDangs = (...items: Dang[]) =>
  setSheetAllRows(SHEET_ID, DANG_SHEET, [DANG_HEADERS, ...items.map(dangToRow)])

/** One record of 100 000 that pays two debts: 40 000 and 60 000. */
const seedTwoDebtsOneRecord = () =>
  seedDangs(
    makeDang({ id: 'd1', title: 'وام', payments: [payment('p1', 40_000, 'rec-1')] }),
    makeDang({ id: 'd2', title: 'لامپ', payments: [payment('p2', 60_000, 'rec-1')] })
  )

beforeEach(() => {
  localStorage.clear()
  clearStore(SHEET_ID)
  mocks.api.mockReset()
  mocks.info.mockReset()
})

describe('a record that pays several debts', () => {
  it('keeps every share when its amount is edited: only a notice, no write', async () => {
    seedTwoDebtsOneRecord()

    const notes = await syncLinkedOnRecordUpdated(
      SHEET_ID,
      'rec-1',
      'expense',
      { amount: '100000' },
      { amount: '120000' }
    )

    expect(notes).toEqual([])
    expect(mocks.api).not.toHaveBeenCalled()
    expect((await fetchDangs(SHEET_ID)).map(dang => dang.payments[0].amount)).toEqual([
      40_000, 60_000
    ])
    expect(mocks.info).toHaveBeenCalledWith(
      expect.stringContaining('تقسیم شده'),
      expect.any(Number)
    )
  })

  it('refuses an amount edit at the form, with the way out', () => {
    seedTwoDebtsOneRecord()

    const message = sharedAmountLockMessage(
      SHEET_ID,
      'rec-1',
      'expense',
      { amount: '100000', title: 'a' },
      { amount: '120000', title: 'a' }
    )

    expect(message).toContain('بین چند پرداخت')
    expect(message).toContain('بردار')
  })

  it('allows an edit that leaves the amount alone', () => {
    seedTwoDebtsOneRecord()
    expect(
      sharedAmountLockMessage(
        SHEET_ID,
        'rec-1',
        'expense',
        { amount: '100000', title: 'a' },
        { amount: '100000', title: 'b' }
      )
    ).toBe('')
  })

  it('does not lock a record that pays one debt', () => {
    seedDangs(makeDang({ payments: [payment('p1', 100_000, 'rec-1')] }))
    expect(
      sharedAmountLockMessage(SHEET_ID, 'rec-1', 'expense', { amount: '100000' }, { amount: '1' })
    ).toBe('')
  })

  it('is shared for each debt it pays, so taking one payment back keeps the record', () => {
    seedTwoDebtsOneRecord()
    expect(isRecordSharedElsewhere(SHEET_ID, 'rec-1', 'expense', 'd1')).toBe(true)
    expect(isRecordSharedElsewhere(SHEET_ID, 'rec-1', 'expense', 'd2')).toBe(true)
  })

  it('stays locked when only one share is left: that debt holds part of the amount, not all', () => {
    seedDangs(makeDang({ payments: [payment('p1', 40_000, 'rec-1')] }))
    expect(
      sharedAmountLockMessage(
        SHEET_ID,
        'rec-1',
        'expense',
        { amount: '100000' },
        { amount: '120000' }
      )
    ).toContain('بین چند پرداخت')
  })

  it('is not shared when it pays this debt only', () => {
    seedDangs(makeDang({ payments: [payment('p1', 100_000, 'rec-1')] }))
    expect(isRecordSharedElsewhere(SHEET_ID, 'rec-1', 'expense', 'd1')).toBe(false)
  })
})
