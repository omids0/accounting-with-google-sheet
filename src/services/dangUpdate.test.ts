import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Dang } from '../types'

const mocks = vi.hoisted(() => ({ log: vi.fn() }))

vi.mock('./sheetSync', () => ({ enqueueSheetWrite: vi.fn(), queueOutboxWrite: vi.fn() }))
vi.mock('./activityLog', () => ({ logActivity: vi.fn(), logItemActivity: mocks.log }))

const { fetchDangs, updateDang } = await import('./dang')
const { dangToRow, withDangPaidState } = await import('./dangRow')
const { DANG_HEADERS } = await import('./sheetHeaders')
const { DANG_SHEET } = await import('./sheetNames')
const { clearStore, setSheetAllRows } = await import('./spreadsheetStore')

const SHEET_ID = 'test-dang-update'

const makeDang = (over: Partial<Dang> = {}): Dang => ({
  id: 'd1',
  createdAt: 't',
  title: 'خرید لامپ',
  category: 'خانه',
  subCategory: '',
  counterparty: 'رضا',
  amount: 100_000,
  date: '2026-10-01',
  note: '',
  paid: false,
  paidAt: '',
  payments: [],
  ...over
})

const payment = (id: string, amount: number, transactionRecordId: string) => ({
  id,
  amount,
  paidAt: '2026-10-05',
  note: '',
  transactionRecordId
})

const seed = (...dangs: Dang[]) =>
  setSheetAllRows(SHEET_ID, DANG_SHEET, [
    DANG_HEADERS,
    ...dangs.map(dang => dangToRow(withDangPaidState(dang)))
  ])

const byId = async (id: string) => (await fetchDangs(SHEET_ID)).find(item => item.id === id)!

describe('updateDang keeps the payments of the sheet, not of the screen', () => {
  beforeEach(() => {
    localStorage.clear()
    clearStore(SHEET_ID)
    mocks.log.mockClear()
  })

  it('saves the edited fields but keeps a payment added after the screen loaded', async () => {
    seed(makeDang())

    const stale = await byId('d1')

    // Another device pays 30k while this screen still shows the debt unpaid.
    seed(makeDang({ payments: [payment('p1', 30_000, 'rec-1')] }))

    await updateDang(SHEET_ID, stale.rowNumber, { ...stale, title: 'لامپ جدید', note: 'تغییر' })

    expect(await byId('d1')).toMatchObject({
      title: 'لامپ جدید',
      note: 'تغییر',
      paid: false,
      payments: [{ id: 'p1', amount: 30_000, transactionRecordId: 'rec-1' }]
    })
    expect(mocks.log).toHaveBeenCalledOnce()
  })

  it('does not let a stale copy undo a payment through its paid flag', async () => {
    seed(makeDang())

    const stale = { ...(await byId('d1')), paid: true, paidAt: '2026-10-09' }

    seed(makeDang({ payments: [payment('p1', 40_000, 'rec-1')] }))
    await updateDang(SHEET_ID, 2, stale)

    expect(await byId('d1')).toMatchObject({ paid: false, paidAt: '' })
  })

  it('refuses an amount below what the sheet says was paid, even if the screen knows less', async () => {
    seed(makeDang())

    const stale = await byId('d1')

    seed(makeDang({ payments: [payment('p1', 60_000, 'rec-1')] }))

    await expect(
      updateDang(SHEET_ID, stale.rowNumber, { ...stale, amount: 50_000 })
    ).rejects.toMatchObject({ reason: 'below-paid' })
    expect((await byId('d1')).amount).toBe(100_000)
  })

  it('settles the debt when the new amount equals what was paid', async () => {
    seed(makeDang({ payments: [payment('p1', 60_000, 'rec-1')] }))
    await updateDang(SHEET_ID, 2, { ...(await byId('d1')), amount: 60_000 })

    expect(await byId('d1')).toMatchObject({ paid: true, transactionRecordId: 'rec-1' })
  })

  it('writes to the row the debt is on now, not the number the screen remembers', async () => {
    seed(makeDang({ id: 'other', title: 'دیگری' }), makeDang())

    // The screen thinks d1 is on row 2, but another device deleted the row above it.
    const stale = { ...(await byId('d1')), rowNumber: 2 }

    await updateDang(SHEET_ID, 2, { ...stale, title: 'تازه' })

    expect((await byId('d1')).title).toBe('تازه')
    expect((await byId('other')).title).toBe('دیگری')
  })

  it('stops when the debt was deleted elsewhere instead of writing over another row', async () => {
    seed(makeDang({ id: 'other', title: 'دیگری' }))

    await expect(updateDang(SHEET_ID, 2, makeDang({ title: 'تازه' }))).rejects.toMatchObject({
      reason: 'missing'
    })
    expect((await byId('other')).title).toBe('دیگری')
    expect(mocks.log).not.toHaveBeenCalled()
  })

  it('stays quiet in the activity log for a bulk rewrite', async () => {
    seed(makeDang())
    await updateDang(SHEET_ID, 2, { ...(await byId('d1')), category: 'کار' }, false)

    expect((await byId('d1')).category).toBe('کار')
    expect(mocks.log).not.toHaveBeenCalled()
  })
})
