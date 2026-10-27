import { describe, expect, it, vi } from 'vitest'

import type { Dang, Receivable } from '../types'

vi.mock('./sheetSync', () => ({ enqueueSheetWrite: vi.fn(), queueOutboxWrite: vi.fn() }))

const { dangToRow, rowToDang } = await import('./dangRow')
const { mergeQueuedPaymentRow, showMergedRowLocally } = await import('./paymentRowMerge')
const { receivableToRow, rowToReceivable } = await import('./receivablesRow')
const { DANG_SHEET, RECEIVABLES_SHEET } = await import('./sheetNames')
const { clearStore, getSheetRow, setSheetAllRows } = await import('./spreadsheetStore')

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

const idsOfDang = (row: string[]) => rowToDang(row, 0).payments.map(item => item.id)

describe('mergeQueuedPaymentRow, debts', () => {
  const base = dangToRow(dang())

  it('keeps the payment another device added and adds this write payment', () => {
    const current = dangToRow(dang({ payments: [payment('a', 6_000_000)] }))
    const mine = dangToRow(dang({ payments: [payment('b', 3_000_000)] }))

    const merged = mergeQueuedPaymentRow(DANG_SHEET, mine, base, current)

    expect(idsOfDang(merged!.row)).toEqual(['a', 'b'])
    // 9M of 10M: not settled, so the legacy paid columns stay empty.
    expect(merged!.row[8]).toBe('خیر')
  })

  it('recomputes the paid columns from the merged ledger', () => {
    const current = dangToRow(dang({ payments: [payment('a', 6_000_000)] }))
    const mine = dangToRow(dang({ payments: [payment('b', 4_000_000)] }))

    const merged = mergeQueuedPaymentRow(DANG_SHEET, mine, base, current)!

    expect(merged.row[8]).toBe('بله')
    expect(merged.row[10]).toBe('rec-b')
  })

  it('keeps every payment when they add up past the amount (the ledger clamps remaining)', () => {
    const current = dangToRow(dang({ payments: [payment('a', 6_000_000)] }))
    const mine = dangToRow(dang({ payments: [payment('b', 6_000_000)] }))

    const merged = mergeQueuedPaymentRow(DANG_SHEET, mine, base, current)!

    expect(idsOfDang(merged.row)).toEqual(['a', 'b'])
  })

  it('a stale title edit cannot wipe the ledger and the title is still the edit', () => {
    const current = dangToRow(dang({ payments: [payment('a', 6_000_000)] }))
    const mine = dangToRow(dang({ title: 'عنوان تازه' }))

    const merged = mergeQueuedPaymentRow(DANG_SHEET, mine, base, current)!

    expect(idsOfDang(merged.row)).toEqual(['a'])
    expect(rowToDang(merged.row, 0).title).toBe('عنوان تازه')
  })

  it('removes a payment only when this write removed it', () => {
    const paid = dang({ payments: [payment('a', 1_000_000), payment('b', 2_000_000)] })

    const current = dangToRow(dang({ payments: [...paid.payments, payment('c', 3_000_000)] }))
    const mine = dangToRow(dang({ payments: [paid.payments[1]] }))

    const merged = mergeQueuedPaymentRow(DANG_SHEET, mine, dangToRow(paid), current)!

    expect(idsOfDang(merged.row)).toEqual(['b', 'c'])
  })

  it('returns the write itself when nothing was added meanwhile', () => {
    const mine = dangToRow(dang({ payments: [payment('a', 1_000_000)] }))

    const merged = mergeQueuedPaymentRow(DANG_SHEET, mine, base, [...base])!

    expect(merged.row).toBe(mine)
  })

  it('knows when the sheet differs from the base only in payments', () => {
    const mine = dangToRow(dang({ title: 'من' }))

    const onlyPayment = dangToRow(dang({ payments: [payment('a', 6_000_000)], writer: 'x@y.z' }))

    const edited = dangToRow(dang({ title: 'دیگری', payments: [payment('a', 6_000_000)] }))

    expect(mergeQueuedPaymentRow(DANG_SHEET, mine, base, onlyPayment)!.paymentsOnly).toBe(true)
    expect(mergeQueuedPaymentRow(DANG_SHEET, mine, base, edited)!.paymentsOnly).toBe(false)
  })

  it('does nothing for writes without a base, other tabs or unreadable rows', () => {
    const mine = dangToRow(dang())

    expect(mergeQueuedPaymentRow(DANG_SHEET, mine, undefined, base)).toBeNull()
    expect(mergeQueuedPaymentRow(DANG_SHEET, mine, base, undefined)).toBeNull()
    expect(mergeQueuedPaymentRow('هزینه', mine, base, base)).toBeNull()
    // Old four-column layout: the amount sits in column 4.
    expect(mergeQueuedPaymentRow(DANG_SHEET, mine, base, ['d1', 't', 'x', 'علی', '500'])).toBeNull()
  })
})

describe('mergeQueuedPaymentRow, receivables', () => {
  const base = receivableToRow(receivable())

  it('keeps the payment another device added and adds this write payment', () => {
    const current = receivableToRow(receivable({ payments: [payment('a', 6_000_000)] }))
    const mine = receivableToRow(receivable({ payments: [payment('b', 3_000_000)] }))

    const merged = mergeQueuedPaymentRow(RECEIVABLES_SHEET, mine, base, current)!

    expect(rowToReceivable(merged.row, 0).payments.map(item => item.id)).toEqual(['a', 'b'])
  })

  it('a stale edit keeps the sheet payments and its own amount', () => {
    const current = receivableToRow(receivable({ payments: [payment('a', 6_000_000)] }))
    const mine = receivableToRow(receivable({ amount: 12_000_000 }))

    const merged = mergeQueuedPaymentRow(RECEIVABLES_SHEET, mine, base, current)!

    const row = rowToReceivable(merged.row, 0)

    expect(row.payments.map(item => item.id)).toEqual(['a'])
    expect(row.amount).toBe(12_000_000)
  })
})

describe('showMergedRowLocally', () => {
  const SHEET_ID = 'merge-local'

  it('shows the merged row unless a newer local edit replaced the written one', () => {
    clearStore(SHEET_ID)

    const written = dangToRow(dang({ payments: [payment('b', 1)] }))

    const merged = dangToRow(dang({ payments: [payment('a', 1), payment('b', 1)] }))

    setSheetAllRows(SHEET_ID, DANG_SHEET, [['شناسه'], written])
    showMergedRowLocally(SHEET_ID, DANG_SHEET, written, merged)
    expect(getSheetRow(SHEET_ID, DANG_SHEET, 2)).toEqual(merged)

    const newer = dangToRow(dang({ payments: [payment('b', 1), payment('c', 1)] }))

    setSheetAllRows(SHEET_ID, DANG_SHEET, [['شناسه'], newer])
    showMergedRowLocally(SHEET_ID, DANG_SHEET, written, merged)
    expect(getSheetRow(SHEET_ID, DANG_SHEET, 2)).toEqual(newer)
  })
})
