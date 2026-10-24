import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Check } from '../types'

const mocks = vi.hoisted(() => ({
  rows: [] as string[][],
  appended: [] as string[][],
  updated: [] as { rowNumber: number; row: string[] }[],
  createLinked: vi.fn(async () => 'rec-1'),
  deleteLinkedWithWallet: vi.fn(async () => undefined),
  deleteLinked: vi.fn(async () => ({ walletAccount: '', walletApply: '' })),
  transform: undefined as ((cells: string[]) => string[] | null) | undefined
}))

vi.mock('./activityLog', () => ({ logItemActivity: vi.fn() }))
vi.mock('./settleRecords', () => ({
  createLinkedRecordWithWallet: mocks.createLinked,
  deleteLinkedRecordWithWallet: mocks.deleteLinkedWithWallet
}))
vi.mock('./paymentTransactions', () => ({ deleteLinkedRecord: mocks.deleteLinked }))
vi.mock('./sheets', () => ({
  appendSheetRow: async (_id: string, _tab: string, row: string[]) => {
    mocks.appended.push(row)
  },
  updateSheetRow: async (_id: string, _tab: string, rowNumber: number, row: string[]) => {
    mocks.updated.push({ rowNumber, row })
  },
  deleteSheetRow: vi.fn(),
  ensureSheetWithHeaders: vi.fn(),
  fetchSheetRows: async () => mocks.rows
}))
vi.mock('./importExport', () => ({
  exportSheetCsv: vi.fn(),
  importSheetCsv: async (
    _id: string,
    _tab: string,
    _headers: string[],
    _csv: string,
    transform: (cells: string[]) => string[] | null
  ) => {
    mocks.transform = transform
  },
  newImportId: (raw: string) => raw || 'new-id',
  newImportTimestamp: (raw: string) => raw || 'now'
}))

const {
  CHECK_EXPENSE_CATEGORY,
  CHECK_INCOME_CATEGORY,
  CHECKS_HEADERS,
  createCheck,
  deleteCheck,
  fetchChecks,
  importChecksCsv,
  toggleCheckPaid,
  totalChecksInRange,
  totalUnpaidChecksInRange
} = await import('./checks')
const { CHECK_DIRECTION_COLUMN } = await import('./checkDirection')

const SHEET = 'sheet-1'

const base: Check & { rowNumber: number } = {
  rowNumber: 2,
  id: 'c1',
  createdAt: '',
  checkNumber: '123',
  direction: 'paid',
  counterparty: 'علی',
  amount: 500_000,
  creationDate: '2026-10-01',
  dueDate: '2026-10-20',
  paid: false,
  paidAt: ''
}

beforeEach(() => {
  mocks.rows = []
  mocks.appended = []
  mocks.updated = []
  mocks.transform = undefined
  mocks.createLinked.mockClear()
  mocks.deleteLinkedWithWallet.mockClear()
  mocks.deleteLinked.mockClear()
})

describe('the «نوع چک» column', () => {
  it('sits after «ثبت‌کننده», so no existing column moves', () => {
    expect(CHECK_DIRECTION_COLUMN).toBe(CHECKS_HEADERS.length - 1)
    expect(CHECKS_HEADERS.slice(0, 13)).toEqual([
      'شناسه',
      'زمان ثبت',
      'شماره چک',
      'طرف حساب',
      'مبلغ',
      'تاریخ صدور',
      'تاریخ سررسید',
      'پرداخت شده',
      'زمان پرداخت',
      'شناسه تراکنش',
      'زیردسته',
      'پیوست',
      'ثبت‌کننده'
    ])
  })

  it('reads an old row, with or without the cell, as a payable', async () => {
    const oldShort = ['a', '', '1', 'علی', '100', '', '2026-10-20', 'خیر', '', '', '']
    const oldFull = [...oldShort, 'att1', 'me@x.com']
    const received = [...oldFull, 'دریافتی']
    const paid = [...oldFull, 'پرداختی']

    mocks.rows = [oldShort, oldFull, received, paid, [...oldFull, 'نامعلوم']]

    const checks = await fetchChecks(SHEET)

    expect(checks.map(c => c.direction).sort()).toEqual([
      'paid',
      'paid',
      'paid',
      'paid',
      'received'
    ])
    expect(checks.find(c => c.id === 'a' && c.writer === 'me@x.com')?.attachments).toEqual(['att1'])
  })

  it('writes the type at its fixed index and leaves «پیوست» and «ثبت‌کننده» for their writers', async () => {
    await createCheck(SHEET, {
      checkNumber: '9',
      direction: 'received',
      counterparty: 'رضا',
      amount: 10,
      creationDate: '2026-10-01',
      dueDate: '2026-10-02'
    })
    await createCheck(SHEET, {
      checkNumber: '10',
      direction: 'paid',
      counterparty: 'رضا',
      amount: 10,
      creationDate: '2026-10-01',
      dueDate: '2026-10-02'
    })

    const [received, paid] = mocks.appended

    expect(received).toHaveLength(CHECKS_HEADERS.length)
    expect(received[CHECK_DIRECTION_COLUMN]).toBe('دریافتی')
    expect(received.slice(11, 13)).toEqual(['', ''])
    expect(paid[CHECK_DIRECTION_COLUMN]).toBe('پرداختی')
  })
})

describe('passing a check', () => {
  it('records a payable as an expense and a received check as income, both under «چک»', async () => {
    await toggleCheckPaid(SHEET, base, true)
    await toggleCheckPaid(SHEET, { ...base, direction: 'received' }, true)

    const calls = mocks.createLinked.mock.calls as unknown as [
      string,
      string,
      { category: string }
    ][]

    expect(calls.map(call => call[1])).toEqual(['expense', 'income'])
    expect(calls[0][2].category).toBe(CHECK_EXPENSE_CATEGORY)
    expect(calls[1][2].category).toBe(CHECK_INCOME_CATEGORY)
  })

  it('keeps the type in the saved row and links the new record', async () => {
    const updated = await toggleCheckPaid(SHEET, { ...base, direction: 'received' }, true)

    expect(updated).toMatchObject({
      paid: true,
      transactionRecordId: 'rec-1',
      direction: 'received'
    })
    expect(mocks.updated[0].row[CHECK_DIRECTION_COLUMN]).toBe('دریافتی')
    expect(mocks.updated[0].row[9]).toBe('rec-1')
  })

  it('un-passing reverses the record of the same kind', async () => {
    const passed = { ...base, paid: true, transactionRecordId: 'rec-9' }

    await toggleCheckPaid(SHEET, passed, false)
    await toggleCheckPaid(SHEET, { ...passed, direction: 'received' }, false)

    const calls = mocks.deleteLinkedWithWallet.mock.calls as unknown as [string, string, string][]

    expect(calls.map(call => [call[1], call[2]])).toEqual([
      ['expense', 'rec-9'],
      ['income', 'rec-9']
    ])
    expect(mocks.updated.every(entry => entry.row[7] === 'خیر' && entry.row[9] === '')).toBe(true)
  })

  it('deleting a passed check removes the record of its own kind', async () => {
    await deleteCheck(SHEET, 2, { ...base, paid: true, transactionRecordId: 'r1' })
    await deleteCheck(SHEET, 2, {
      ...base,
      direction: 'received',
      paid: true,
      transactionRecordId: 'r2'
    })

    expect(mocks.deleteLinked.mock.calls).toEqual([
      [SHEET, 'expense', 'r1'],
      [SHEET, 'income', 'r2']
    ])
  })
})

describe('totals', () => {
  const range = { start: '2026-10-01', end: '2026-10-31' }

  const checks: Check[] = [
    { ...base, id: 'a', amount: 100 },
    { ...base, id: 'b', amount: 40, direction: 'received' },
    { ...base, id: 'c', amount: 7, direction: 'received', paid: true },
    { ...base, id: 'd', amount: 1000, dueDate: '2026-12-01' }
  ]

  it('sums all, or one type', () => {
    expect(totalChecksInRange(checks, range)).toBe(147)
    expect(totalChecksInRange(checks, range, 'paid')).toBe(100)
    expect(totalChecksInRange(checks, range, 'received')).toBe(47)
  })

  it('leaves passed checks out of the unpaid sums', () => {
    expect(totalUnpaidChecksInRange(checks, range)).toBe(140)
    expect(totalUnpaidChecksInRange(checks, range, 'paid')).toBe(100)
    expect(totalUnpaidChecksInRange(checks, range, 'received')).toBe(40)
  })
})

describe('CSV import', () => {
  it('takes the optional type column, and a file without it imports payables', async () => {
    await importChecksCsv(SHEET, '')

    const cells = (extra: string[]) => [
      'x',
      '',
      '55',
      'علی',
      '100',
      '2026-10-01',
      '2026-10-20',
      'خیر',
      '',
      '',
      '',
      '',
      '',
      ...extra
    ]
    const withType = mocks.transform?.(cells(['دریافتی']))
    const without = mocks.transform?.(cells([]).slice(0, 11))

    expect(withType?.[CHECK_DIRECTION_COLUMN]).toBe('دریافتی')
    expect(without?.[CHECK_DIRECTION_COLUMN]).toBe('پرداختی')
  })
})
