import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Dang, Receivable } from '../types'
import type * as SheetsRowsModule from './sheetsRows'

const mocks = vi.hoisted(() => ({
  fetchRange: vi.fn(),
  enqueue: vi.fn(),
  created: [] as string[],
  removed: [] as string[]
}))

vi.mock('./sheetsRows', async importOriginal => ({
  ...(await importOriginal<typeof SheetsRowsModule>()),
  fetchSheetRangeFromApi: mocks.fetchRange
}))
vi.mock('./sheetSync', () => ({ enqueueSheetWrite: mocks.enqueue, queueOutboxWrite: vi.fn() }))
vi.mock('./activityLog', () => ({ logActivity: vi.fn(), logItemActivity: vi.fn() }))
vi.mock('./paymentTransactions', () => ({
  deleteLinkedExpenseRecord: vi.fn(),
  deleteLinkedIncomeRecord: vi.fn()
}))
vi.mock('./settleRecords', () => ({
  createLinkedRecordWithWallet: async (
    _sheet: string,
    _type: string,
    _params: unknown,
    options?: { linkRecordId?: string }
  ) => {
    if (options?.linkRecordId) return options.linkRecordId
    mocks.created.push('x')

    return `rec-${mocks.created.length}`
  },
  deleteLinkedRecordWithWallet: async (_sheet: string, _type: string, id: string) => {
    mocks.removed.push(id)

    return true
  }
}))

const { addDangPayment, removeDangPayment, updateDang, DangPaymentError } = await import('./dang')
const { dangToRow, fetchDangs } = await import('./dangRow')
const { addReceivablePayment, removeReceivablePayment, saveReceivableFields } = await import(
  './receivables'
)
const { ReceivablePaymentError } = await import('./receivablePaymentError')
const { receivableToRow } = await import('./receivablesRow')
const { DANG_HEADERS, RECEIVABLES_HEADERS } = await import('./sheetHeaders')
const { DANG_SHEET, RECEIVABLES_SHEET } = await import('./sheetNames')
const { clearStore, setSheetAllRows } = await import('./spreadsheetStore')

const SHEET_ID = 'fresh-read'

const payment = (id: string, amount: number) => ({
  id,
  amount,
  paidAt: '2026-10-05',
  note: '',
  transactionRecordId: `rec-${id}`
})

const dang = (over: Partial<Dang> = {}): Dang => ({
  id: 'd1',
  createdAt: 't',
  title: 'مشترک',
  category: 'سایر',
  subCategory: '',
  counterparty: 'علی',
  amount: 10_000_000,
  date: '2026-10-01',
  note: '',
  paid: false,
  paidAt: '',
  payments: [],
  ...over
})

const receivable = (over: Partial<Receivable> = {}): Receivable => ({
  id: 'r1',
  createdAt: 't',
  title: 'قرض',
  debtor: 'رضا',
  category: 'سایر',
  amount: 10_000_000,
  borrowDate: '2026-10-01',
  note: '',
  payments: [],
  ...over
})

/** The sheet as another device left it; this device's mirror stays on the old copy. */
const LINK = {
  date: '2026-10-05',
  walletAccount: 'acc1',
  walletApply: 'بله' as const,
  linkRecordId: 'existing'
}

let remote: Record<string, string[][]> = {}

const lastWrite = () => mocks.enqueue.mock.calls.at(-1)?.[1] as { row: string[] }

const writtenIds = (column: number) =>
  (JSON.parse(lastWrite().row[column]) as { id: string }[]).map(item => item.id)

function seedMirror(dangRow: Dang, receivableRow: Receivable) {
  setSheetAllRows(SHEET_ID, DANG_SHEET, [DANG_HEADERS, dangToRow(dangRow)])
  setSheetAllRows(SHEET_ID, RECEIVABLES_SHEET, [
    RECEIVABLES_HEADERS,
    receivableToRow(receivableRow)
  ])
}

function seedRemote(dangRow: Dang, receivableRow: Receivable) {
  remote = {
    [DANG_SHEET]: [DANG_HEADERS, dangToRow(dangRow)],
    [RECEIVABLES_SHEET]: [RECEIVABLES_HEADERS, receivableToRow(receivableRow)]
  }
}

describe('payments are computed on the row the sheet holds now', () => {
  beforeEach(() => {
    localStorage.clear()
    clearStore(SHEET_ID)
    mocks.enqueue.mockClear()
    mocks.created.length = 0
    mocks.removed.length = 0
    mocks.fetchRange.mockImplementation(async (_id: string, tab: string, suffix?: string) => {
      const rows = remote[tab] ?? []

      if (suffix === 'A:A') return rows.map(row => [row[0] ?? ''])

      const n = Number(suffix?.split(':')[0])

      return rows[n - 1] ? [rows[n - 1]] : []
    })
    // Device A paid 6M of both; this device (B) still shows them unpaid.
    seedMirror(dang(), receivable())
    seedRemote(
      dang({ payments: [payment('a', 6_000_000)] }),
      receivable({ payments: [payment('a', 6_000_000)] })
    )
  })

  describe('debts', () => {
    it('refuses a second 6M that the sheet row cannot take, creating no record', async () => {
      const [stale] = await fetchDangs(SHEET_ID)

      await expect(addDangPayment(SHEET_ID, stale, { amount: 6_000_000 })).rejects.toBeInstanceOf(
        DangPaymentError
      )
      expect(mocks.created).toHaveLength(0)
      expect(mocks.enqueue).not.toHaveBeenCalled()
    })

    it('adds to the sheet payments, writes both, and refreshes the mirror', async () => {
      const [stale] = await fetchDangs(SHEET_ID)

      const updated = await addDangPayment(SHEET_ID, stale, { amount: 4_000_000 })

      expect(updated.payments.map(item => item.id)).toHaveLength(2)
      expect(updated.payments[0].id).toBe('a')
      expect(writtenIds(13)).toHaveLength(2)
      expect(writtenIds(13)[0]).toBe('a')
      expect(lastWrite().row[8]).toBe('بله')
      expect((await fetchDangs(SHEET_ID))[0].payments).toHaveLength(2)
    })

    it('removes a payment this device has never seen', async () => {
      const [stale] = await fetchDangs(SHEET_ID)

      const updated = await removeDangPayment(SHEET_ID, stale, 'a')

      expect(updated.payments).toHaveLength(0)
      expect(mocks.removed).toEqual(['rec-a'])
    })

    it('keeps the sheet payments when a stale form saves a new title', async () => {
      const [stale] = await fetchDangs(SHEET_ID)

      await updateDang(SHEET_ID, stale.rowNumber, { ...stale, title: 'عنوان تازه' })

      expect(writtenIds(13)).toEqual(['a'])
      expect(lastWrite().row[2]).toBe('عنوان تازه')
    })

    it('says the debt is gone when another device deleted it', async () => {
      const [stale] = await fetchDangs(SHEET_ID)

      remote[DANG_SHEET] = [DANG_HEADERS]
      await expect(addDangPayment(SHEET_ID, stale, { amount: 1 })).rejects.toMatchObject({
        reason: 'missing'
      })
    })

    it('works from the local copy when the sheet cannot be read (offline use)', async () => {
      const [stale] = await fetchDangs(SHEET_ID)

      mocks.fetchRange.mockRejectedValue(new Error('offline'))

      const updated = await addDangPayment(SHEET_ID, stale, { amount: 6_000_000 })

      expect(updated.payments.map(item => item.amount)).toEqual([6_000_000])
    })

    it('a linked record (options.linkRecordId) creates no record and still checks the sheet', async () => {
      const [stale] = await fetchDangs(SHEET_ID)

      await expect(
        addDangPayment(SHEET_ID, stale, { amount: 6_000_000 }, LINK)
      ).rejects.toBeInstanceOf(DangPaymentError)

      const updated = await addDangPayment(SHEET_ID, stale, { amount: 4_000_000 }, LINK)

      expect(updated.payments.at(-1)?.transactionRecordId).toBe('existing')
      expect(mocks.created).toHaveLength(0)
    })
  })

  describe('receivables', () => {
    const stale = () => ({ ...receivable(), rowNumber: 2 })

    it('refuses a second 6M that the sheet row cannot take', async () => {
      await expect(
        addReceivablePayment(SHEET_ID, stale(), { amount: 6_000_000 })
      ).rejects.toBeInstanceOf(ReceivablePaymentError)
      expect(mocks.created).toHaveLength(0)
      expect(mocks.enqueue).not.toHaveBeenCalled()
    })

    it('refuses a zero payment with a typed Persian error', async () => {
      await expect(addReceivablePayment(SHEET_ID, stale(), { amount: 0 })).rejects.toMatchObject({
        reason: 'amount',
        message: expect.stringContaining('بیشتر از صفر')
      })
    })

    it('adds to the sheet payments and ignores the stale payments of the caller', async () => {
      const updated = await addReceivablePayment(SHEET_ID, stale(), { amount: 4_000_000 })

      expect(updated.payments).toHaveLength(2)
      expect(writtenIds(8)).toHaveLength(2)
      expect(writtenIds(8)[0]).toBe('a')
    })

    it('removes a payment this device has never seen', async () => {
      const updated = await removeReceivablePayment(SHEET_ID, stale(), 'a')

      expect(updated.payments).toHaveLength(0)
      expect(mocks.removed).toEqual(['rec-a'])
    })

    it('keeps the sheet payments when a stale form saves, and refuses an amount below them', async () => {
      await saveReceivableFields(SHEET_ID, { ...stale(), title: 'عنوان تازه' })
      expect(writtenIds(8)).toEqual(['a'])
      expect(lastWrite().row[2]).toBe('عنوان تازه')

      await expect(
        saveReceivableFields(SHEET_ID, { ...stale(), amount: 5_000_000 })
      ).rejects.toMatchObject({ reason: 'below-paid' })
    })

    it('a linked record creates nothing and moves no balance', async () => {
      const updated = await addReceivablePayment(SHEET_ID, stale(), { amount: 4_000_000 }, LINK)

      expect(updated.payments.at(-1)?.transactionRecordId).toBe('existing')
      expect(mocks.created).toHaveLength(0)
    })
  })
})
