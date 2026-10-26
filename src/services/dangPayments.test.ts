import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Dang } from '../types'

const mocks = vi.hoisted(() => ({
  created: [] as { type: string; params: Record<string, unknown>; options: unknown }[],
  removed: [] as { type: string; id: string; prefix: unknown; unlink: unknown }[],
  deleted: [] as string[],
  log: vi.fn()
}))

vi.mock('./sheetSync', () => ({ enqueueSheetWrite: vi.fn(), queueOutboxWrite: vi.fn() }))
vi.mock('./activityLog', () => ({ logActivity: mocks.log, logItemActivity: vi.fn() }))
vi.mock('./paymentTransactions', () => ({
  deleteLinkedExpenseRecord: async (_sheet: string, id: string) => {
    mocks.deleted.push(id)
  }
}))
vi.mock('./settleRecords', () => ({
  // Like the real one: a linked record is the payment, nothing is created.
  createLinkedRecordWithWallet: async (
    _sheet: string,
    type: string,
    params: Record<string, unknown>,
    options?: { linkRecordId?: string }
  ) => {
    if (options?.linkRecordId) return options.linkRecordId
    mocks.created.push({ type, params, options })

    return `rec-${mocks.created.length}`
  },
  deleteLinkedRecordWithWallet: async (
    _sheet: string,
    type: string,
    id: string,
    prefix: unknown,
    unlink: unknown
  ) => {
    mocks.removed.push({ type, id, prefix, unlink })

    return true
  }
}))

const { deleteDang, fetchDangs, toggleDangPaid, updateDang } = await import('./dang')
const { dangToRow } = await import('./dangRow')
const { DangPaymentError } = await import('./dangPaymentError')
const { addDangPayment, removeDangPayment, settleRestOfDang } = await import('./dangPayments')
const { DANG_HEADERS } = await import('./sheetHeaders')
const { DANG_SHEET } = await import('./sheetNames')
const { clearStore, getSheetRow, setSheetAllRows } = await import('./spreadsheetStore')

const SHEET_ID = 'test-dang-payments'

const makeDang = (over: Partial<Dang> = {}): Dang => ({
  id: 'd1',
  createdAt: 't',
  title: 'خرید لامپ',
  category: 'خانه',
  subCategory: 'برق',
  counterparty: 'رضا',
  amount: 100_000,
  date: '2026-10-01',
  note: 'یادداشت',
  paid: false,
  paidAt: '',
  payments: [],
  ...over
})

const seed = (dang: Dang) => setSheetAllRows(SHEET_ID, DANG_SHEET, [DANG_HEADERS, dangToRow(dang)])

const current = async () => {
  const [row] = await fetchDangs(SHEET_ID)

  return row
}

const OPTIONS = { date: '2026-10-05', walletAccount: 'melat', walletApply: 'بله' as const }

function reset() {
  localStorage.clear()
  clearStore(SHEET_ID)
  mocks.created.length = 0
  mocks.removed.length = 0
  mocks.deleted.length = 0
  mocks.log.mockClear()
  seed(makeDang())
}

describe('paying a debt in pieces', () => {
  beforeEach(reset)

  it('adds a partial payment: an expense under «بدهی › <category>», debt stays open', async () => {
    const updated = await addDangPayment(SHEET_ID, await current(), { amount: 30_000 }, OPTIONS)

    expect(mocks.created).toHaveLength(1)
    expect(mocks.created[0]).toMatchObject({
      type: 'expense',
      params: {
        title: 'بدهی: خرید لامپ',
        amount: 30_000,
        category: 'بدهی',
        subCategory: 'خانه',
        date: '2026-10-05'
      },
      options: OPTIONS
    })
    expect(updated.paid).toBe(false)
    expect(updated.payments).toMatchObject([
      { amount: 30_000, paidAt: '2026-10-05', transactionRecordId: 'rec-1' }
    ])
    expect(await current()).toMatchObject({ paid: false, paidAt: '' })
    expect(getSheetRow(SHEET_ID, DANG_SHEET, 2)?.[8]).toBe('خیر')
    expect(mocks.log).toHaveBeenCalledWith(
      SHEET_ID,
      expect.objectContaining({ action: 'pay', module: 'dang', itemId: 'd1' })
    )
    expect(mocks.log.mock.calls[0][1].summary).toContain('خرید لامپ')
  })

  it('flips paid when the payments reach the amount', async () => {
    await addDangPayment(SHEET_ID, await current(), { amount: 30_000 }, OPTIONS)

    const done = await settleRestOfDang(SHEET_ID, await current(), undefined, OPTIONS)

    expect(done).toMatchObject({ paid: true, paidAt: '2026-10-05', transactionRecordId: 'rec-2' })
    expect(mocks.created[1].params.amount).toBe(70_000)
    expect(getSheetRow(SHEET_ID, DANG_SHEET, 2)?.slice(8, 11)).toEqual([
      'بله',
      '2026-10-05',
      'rec-2'
    ])
  })

  it('rejects zero, negative and over-remaining amounts without creating a record', async () => {
    await addDangPayment(SHEET_ID, await current(), { amount: 90_000 }, OPTIONS)
    mocks.created.length = 0

    for (const amount of [0, -5, 10_001]) {
      await expect(
        addDangPayment(SHEET_ID, await current(), { amount }, OPTIONS)
      ).rejects.toBeInstanceOf(DangPaymentError)
    }
    expect(mocks.created).toHaveLength(0)
    expect((await current()).payments).toHaveLength(1)
  })

  it('computes on the latest row, not on the stale copy the screen holds', async () => {
    const stale = await current()

    await addDangPayment(SHEET_ID, stale, { amount: 60_000 }, OPTIONS)

    // The stale copy still shows 100k remaining; the service sees 40k.
    await expect(
      addDangPayment(SHEET_ID, stale, { amount: 50_000 }, OPTIONS)
    ).rejects.toMatchObject({ reason: 'over-remaining' })

    const next = await addDangPayment(SHEET_ID, stale, { amount: 40_000 }, OPTIONS)

    expect(next.payments.map(p => p.amount)).toEqual([60_000, 40_000])
    expect(next.paid).toBe(true)
  })

  it('creates no record and moves no balance when an existing record is linked', async () => {
    const updated = await addDangPayment(
      SHEET_ID,
      await current(),
      { amount: 20_000 },
      { ...OPTIONS, linkRecordId: 'existing-9' }
    )

    expect(mocks.created).toHaveLength(0)
    expect(updated.payments[0].transactionRecordId).toBe('existing-9')
  })

  it('removes one payment with its record and reopens the debt', async () => {
    await addDangPayment(SHEET_ID, await current(), { amount: 100_000 }, OPTIONS)

    const paid = await current()

    const reopened = await removeDangPayment(SHEET_ID, paid, paid.payments[0].id, 'keep')

    expect(mocks.removed).toEqual([
      { type: 'expense', id: 'rec-1', prefix: ['بدهی: '], unlink: 'keep' }
    ])
    expect(reopened).toMatchObject({ paid: false, payments: [] })

    const row = getSheetRow(SHEET_ID, DANG_SHEET, 2) ?? []

    expect(row[13]).toBe('[]')
    expect(row[8]).toBe('خیر')
    expect(mocks.log.mock.calls.at(-1)?.[1]).toMatchObject({ action: 'unpay', module: 'dang' })
  })

  it('removing a payment that is already gone changes nothing', async () => {
    const before = await current()

    expect(await removeDangPayment(SHEET_ID, before, 'nope')).toMatchObject({ id: 'd1' })
    expect(mocks.removed).toHaveLength(0)
  })

  it('removing a derived legacy payment does not bring it back', async () => {
    setSheetAllRows(SHEET_ID, DANG_SHEET, [
      DANG_HEADERS,
      [
        'd1',
        't',
        'خرید',
        'خانه',
        'رضا',
        '100000',
        '2026-10-01',
        '',
        'بله',
        '2026-09-30',
        'old-rec',
        ''
      ]
    ])

    const legacy = await current()

    expect(legacy.paid).toBe(true)

    await removeDangPayment(SHEET_ID, legacy, legacy.payments[0].id, 'delete')

    expect(mocks.removed[0]).toMatchObject({ id: 'old-rec', unlink: 'delete' })
    expect(await current()).toMatchObject({ paid: false, payments: [] })
  })

  const payTwice = async () => {
    await addDangPayment(SHEET_ID, await current(), { amount: 10_000 }, OPTIONS)
    await addDangPayment(SHEET_ID, await current(), { amount: 20_000 }, OPTIONS)
  }

  it('deleting the debt deletes the record of every payment', async () => {
    await payTwice()
    await deleteDang(SHEET_ID, 2, await current())
    expect(mocks.deleted.sort()).toEqual(['rec-1', 'rec-2'])
  })

  it('deleting the debt keeps the records when asked to', async () => {
    await payTwice()
    await deleteDang(SHEET_ID, 2, await current(), true)
    expect(mocks.deleted).toEqual([])
  })

  it('refuses to save an amount below what was paid', async () => {
    await addDangPayment(SHEET_ID, await current(), { amount: 60_000 }, OPTIONS)

    const paid = await current()

    await expect(updateDang(SHEET_ID, 2, { ...paid, amount: 59_000 })).rejects.toMatchObject({
      reason: 'below-paid'
    })
    await updateDang(SHEET_ID, 2, { ...paid, amount: 60_000 })
    expect((await current()).paid).toBe(true)
  })
})

describe('the building workspace settles in one go', () => {
  beforeEach(reset)

  it('pays with a single full payment and unpays by dropping the payments', async () => {
    const paid = await toggleDangPaid(SHEET_ID, await current(), true, OPTIONS)

    expect(paid).toMatchObject({ paid: true, transactionRecordId: 'rec-1', paidAt: '2026-10-05' })
    expect(paid.payments).toHaveLength(1)
    expect(paid.payments[0].amount).toBe(100_000)

    const open = await toggleDangPaid(SHEET_ID, await current(), false)

    expect(open).toMatchObject({ paid: false, payments: [] })
    expect(mocks.removed).toHaveLength(1)
    expect(getSheetRow(SHEET_ID, DANG_SHEET, 2)?.[13]).toBe('[]')
    expect((await current()).paid).toBe(false)
  })
})
