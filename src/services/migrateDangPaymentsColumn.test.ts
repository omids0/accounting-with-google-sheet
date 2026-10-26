import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  rows: [] as string[][],
  written: [] as string[][],
  storage: {} as Record<string, unknown>,
  fetchRange: vi.fn(async () => [] as string[][]),
  failWrites: false
}))

vi.mock('./sheetsEnsure', () => ({
  writeSheetHeaders: async (_id: string, _tab: string, header: string[]) => {
    mocks.written.push(header)
    if (mocks.failWrites) throw new Error('offline')
  }
}))
vi.mock('./sheetGrid', () => ({
  withGridGrowth: (_id: string, _tab: string, _r: number, _c: number, write: () => unknown) =>
    write()
}))
vi.mock('./sheetsRows', () => ({ fetchSheetRangeFromApi: mocks.fetchRange }))
vi.mock('./spreadsheetStore', () => ({
  getSheetAllRows: () => mocks.rows,
  setSheetAllRows: (_id: string, _tab: string, rows: string[][]) => {
    mocks.rows = rows
  }
}))
vi.mock('./storage', () => ({
  getItem: (key: string) => mocks.storage[key] ?? null,
  setItem: (key: string, value: unknown) => {
    mocks.storage[key] = value
  }
}))

const { migrateDangPaymentsColumn, resetDangPaymentsMigrationSession } = await import(
  './migrateDangPaymentsColumn'
)
const { DANG_HEADERS } = await import('./sheetHeaders')

const WRITER = DANG_HEADERS.indexOf('ثبت‌کننده')
const PAYMENTS = DANG_HEADERS.indexOf('پرداخت‌ها')
const OLD_HEADER = DANG_HEADERS.slice(0, PAYMENTS)
const ROW = ['a', '', 'شام', 'خوراک', 'علی', '100', '2026-10-20', '', 'خیر', '', '', '', '']

beforeEach(() => {
  mocks.rows = [OLD_HEADER, ROW]
  mocks.written = []
  mocks.storage = {}
  mocks.failWrites = false
  mocks.fetchRange.mockClear()
  resetDangPaymentsMigrationSession()
})

describe('migrateDangPaymentsColumn', () => {
  it('puts the label on index 13 and keeps the writer label on 12', async () => {
    await migrateDangPaymentsColumn('s1')

    expect(mocks.written).toEqual([DANG_HEADERS])
    expect(mocks.written[0][WRITER]).toBe('ثبت‌کننده')
    expect(mocks.written[0][PAYMENTS]).toBe('پرداخت‌ها')
    expect(mocks.rows[0]).toEqual(DANG_HEADERS)
    expect(mocks.rows[1]).toEqual(ROW)
  })

  it('pads a missing writer label so the new one can never land on its index', async () => {
    mocks.rows = [OLD_HEADER.slice(0, WRITER), ROW.slice(0, 12)]
    await migrateDangPaymentsColumn('s1')

    expect(mocks.written[0]).toHaveLength(14)
    expect(mocks.written[0][WRITER]).toBe('ثبت‌کننده')
    expect(mocks.written[0][PAYMENTS]).toBe('پرداخت‌ها')
  })

  it('does nothing, and asks nobody, when the label is already there', async () => {
    mocks.rows = [DANG_HEADERS, ROW]
    await migrateDangPaymentsColumn('s1')
    await migrateDangPaymentsColumn('s1')

    expect(mocks.written).toEqual([])
    expect(mocks.fetchRange).not.toHaveBeenCalled()
  })

  it('writes once per spreadsheet', async () => {
    await migrateDangPaymentsColumn('s1')
    mocks.rows = [OLD_HEADER, ROW]
    await migrateDangPaymentsColumn('s1')

    expect(mocks.written).toHaveLength(1)
  })

  it('reads the tab from the API only when the mirror is empty', async () => {
    mocks.rows = []
    mocks.fetchRange.mockResolvedValueOnce([OLD_HEADER, ROW])
    await migrateDangPaymentsColumn('s1')

    expect(mocks.fetchRange).toHaveBeenCalledTimes(1)
    expect(mocks.written).toEqual([DANG_HEADERS])
  })

  it('leaves a tab with no header alone (it is created with the current one)', async () => {
    mocks.rows = []
    await migrateDangPaymentsColumn('s1')

    expect(mocks.written).toEqual([])
  })

  it('never takes over a column of the user at that index', async () => {
    mocks.rows = [[...OLD_HEADER, 'یادداشت من'], ROW]
    await migrateDangPaymentsColumn('s1')
    expect(mocks.written).toEqual([])

    resetDangPaymentsMigrationSession()
    mocks.rows = [OLD_HEADER, [...ROW, 'something typed by hand']]
    await migrateDangPaymentsColumn('s2')
    expect(mocks.written).toEqual([])
  })

  it('accepts payments written before the label (offline) and keeps columns to the right', async () => {
    mocks.rows = [
      [...OLD_HEADER, '', 'ستون من'],
      [...ROW, '[]']
    ]
    mocks.rows[0][PAYMENTS] = ''
    await migrateDangPaymentsColumn('s1')

    expect(mocks.written[0]).toEqual(DANG_HEADERS)
    expect(mocks.rows[0]).toEqual([...DANG_HEADERS, 'ستون من'])
  })

  it('does not retry a failed write in the same session, and mirrors nothing', async () => {
    mocks.failWrites = true
    await expect(migrateDangPaymentsColumn('s1')).rejects.toThrow('offline')

    expect(mocks.rows[0]).toEqual(OLD_HEADER)
    expect(mocks.storage).toEqual({})
  })
})
