import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Check } from '../types'

const mocks = vi.hoisted(() => ({
  appended: [] as string[][],
  updated: [] as { rowNumber: number; row: string[] }[],
  createLinked: vi.fn(async () => 'rec-1'),
  deleteLinkedWithWallet: vi.fn(async () => true),
  info: vi.fn()
}))

vi.mock('./activityLog', () => ({ logItemActivity: vi.fn() }))
vi.mock('../utils/toast', () => ({ showInfo: mocks.info }))
vi.mock('./settleRecords', () => ({
  createLinkedRecordWithWallet: mocks.createLinked,
  deleteLinkedRecordWithWallet: mocks.deleteLinkedWithWallet
}))
vi.mock('./sheets', () => ({
  appendSheetRow: async (_id: string, _tab: string, row: string[]) => {
    mocks.appended.push(row)
  },
  updateSheetRow: async (_id: string, _tab: string, rowNumber: number, row: string[]) => {
    mocks.updated.push({ rowNumber, row })
  },
  deleteSheetRow: vi.fn(),
  ensureSheetWithHeaders: vi.fn(),
  fetchSheetRows: async (id: string, tab: string) => (getSheetAllRows(id, tab) ?? []).slice(1)
}))
const {
  CHECK_EXPENSE_CATEGORY,
  CHECK_INCOME_CATEGORY,
  CHECKS_HEADERS,
  CHECKS_SHEET,
  createCheck,
  deleteCheck,
  fetchChecks,
  toggleCheckPaid,
  updateCheck
} = await import('./checks')
const { CHECK_DIRECTION_COLUMN } = await import('./checkDirection')
const { clearStore, getSheetAllRows, setSheetAllRows } = await import('./spreadsheetStore')

const SHEET = 'sheet-1'

/** The app's own columns (to «ثبت‌کننده»), then the user's own column, then «نوع چک». */
const OWN = CHECKS_HEADERS.slice(0, CHECK_DIRECTION_COLUMN)
const FOREIGN_HEADER = [...OWN, 'یادداشت من', 'نوع چک']

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

const data = (overrides = {}) => ({
  checkNumber: '9',
  direction: 'received' as const,
  counterparty: 'رضا',
  amount: 10,
  creationDate: '2026-10-01',
  dueDate: '2026-10-02',
  ...overrides
})

/** A stored row: the app's 13 cells, then `extra`. */
const stored = (extra: string[], id = 'c1') => [
  id,
  '',
  '123',
  'علی',
  '5',
  '2026-10-01',
  '2026-10-20',
  'خیر',
  '',
  '',
  '',
  'att1',
  'me@x.com',
  ...extra
]

beforeEach(() => {
  clearStore(SHEET)
  setSheetAllRows(SHEET, CHECKS_SHEET, [CHECKS_HEADERS])
  mocks.appended = []
  mocks.updated = []
  mocks.createLinked.mockClear()
  mocks.deleteLinkedWithWallet.mockReset().mockResolvedValue(true)
  mocks.info.mockClear()
})

describe('the «نوع چک» column', () => {
  it('sits after «ثبت‌کننده», so no existing column moves', () => {
    expect(CHECK_DIRECTION_COLUMN).toBe(CHECKS_HEADERS.length - 1)
    expect(OWN).toHaveLength(13)
    expect(OWN[11]).toBe('پیوست')
    expect(OWN[12]).toBe('ثبت‌کننده')
  })

  it('reads an old row, with or without the cell, as a payable', async () => {
    setSheetAllRows(SHEET, CHECKS_SHEET, [
      CHECKS_HEADERS,
      stored([], 'a').slice(0, 11),
      stored([], 'b'),
      stored(['دریافتی'], 'c'),
      stored(['پرداختی'], 'd')
    ])

    const checks = await fetchChecks(SHEET)

    expect(checks.map(c => c.direction)).toEqual(['paid', 'paid', 'received', 'paid'])
    expect(checks[1].writer).toBe('me@x.com')
    expect(checks[1].attachments).toEqual(['att1'])
  })

  it('reads the type from wherever the header labels it', async () => {
    setSheetAllRows(SHEET, CHECKS_SHEET, [FOREIGN_HEADER, stored(['خصوصی', 'دریافتی'])])

    expect((await fetchChecks(SHEET))[0].direction).toBe('received')
  })

  it('reads everything as a payable while the tab has no such label', async () => {
    setSheetAllRows(SHEET, CHECKS_SHEET, [OWN, stored(['دریافتی'])])

    expect((await fetchChecks(SHEET))[0].direction).toBe('paid')
  })

  it('names an unknown cell instead of hiding it', async () => {
    setSheetAllRows(SHEET, CHECKS_SHEET, [CHECKS_HEADERS, stored(['نقدی'])])

    const [check] = await fetchChecks(SHEET)

    expect(check.direction).toBe('paid')
    expect(check.directionRaw).toBe('نقدی')
  })

  it('writes the type into the labelled column and leaves the gaps empty', async () => {
    await createCheck(SHEET, data())
    await createCheck(SHEET, data({ direction: 'paid' }))

    const [received, paid] = mocks.appended

    expect(received).toHaveLength(CHECKS_HEADERS.length)
    expect(received[CHECK_DIRECTION_COLUMN]).toBe('دریافتی')
    expect(received.slice(11, 13)).toEqual(['', ''])
    expect(paid[CHECK_DIRECTION_COLUMN]).toBe('پرداختی')
  })

  it('puts the type further right when the user owns the column at its usual place', async () => {
    setSheetAllRows(SHEET, CHECKS_SHEET, [FOREIGN_HEADER])
    await createCheck(SHEET, data())

    const [row] = mocks.appended

    expect(row).toHaveLength(FOREIGN_HEADER.length)
    expect(row[FOREIGN_HEADER.length - 1]).toBe('دریافتی')
    expect(row[CHECK_DIRECTION_COLUMN]).toBe('')
  })

  it('writes no type cell for a payable on a tab that has no label yet', async () => {
    setSheetAllRows(SHEET, CHECKS_SHEET, [OWN])
    await createCheck(SHEET, data({ direction: 'paid' }))

    expect(mocks.appended[0]).toHaveLength(11)
  })
})

describe('editing a stored row', () => {
  it('keeps «ثبت‌کننده», «پیوست» and the user’s own column, and changes only the type cell', async () => {
    setSheetAllRows(SHEET, CHECKS_SHEET, [FOREIGN_HEADER, stored(['خصوصی', 'پرداختی'])])
    await updateCheck(SHEET, 2, { ...base, direction: 'received', amount: 7 })

    const { row } = mocks.updated[0]

    expect(row[12]).toBe('me@x.com')
    expect(row[11]).toBe('att1')
    expect(row[13]).toBe('خصوصی')
    expect(row[14]).toBe('دریافتی')
    expect(row[4]).toBe('7')
  })

  it('does not build on a stored row that is another check', async () => {
    setSheetAllRows(SHEET, CHECKS_SHEET, [CHECKS_HEADERS, stored([], 'other')])
    await updateCheck(SHEET, 2, base)

    expect(mocks.updated[0].row[11]).toBe('')
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
    expect(mocks.info).not.toHaveBeenCalled()
  })

  it('says so when the linked record is nowhere to be found', async () => {
    mocks.deleteLinkedWithWallet.mockResolvedValue(false)

    const updated = await toggleCheckPaid(
      SHEET,
      { ...base, paid: true, transactionRecordId: 'gone' },
      false
    )

    expect(updated.paid).toBe(false)
    expect(mocks.info).toHaveBeenCalledTimes(1)
  })

  it('deleting a passed check removes the record of its own kind', async () => {
    await deleteCheck(SHEET, 2, { ...base, paid: true, transactionRecordId: 'r1' })
    await deleteCheck(SHEET, 2, {
      ...base,
      direction: 'received',
      paid: true,
      transactionRecordId: 'r2'
    })

    expect(mocks.deleteLinkedWithWallet.mock.calls).toEqual([
      [SHEET, 'expense', 'r1', 'چک: ', 'delete'],
      [SHEET, 'income', 'r2', 'چک: ', 'delete']
    ])
  })
})
