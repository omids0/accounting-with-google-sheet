import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  rows: [] as string[][],
  written: [] as string[][],
  storage: {} as Record<string, unknown>,
  fetchRange: vi.fn(async () => [] as string[][])
}))

vi.mock('./sheetsEnsure', () => ({
  writeSheetHeaders: async (_id: string, _tab: string, header: string[]) => {
    mocks.written.push(header)
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

const { migrateCheckDirectionColumn } = await import('./migrateCheckDirectionColumn')
const { CHECK_DIRECTION_COLUMN, CHECK_DIRECTION_HEADER } = await import('./checkDirection')
const { CHECKS_HEADERS } = await import('./sheetHeaders')

const OLD_HEADER = CHECKS_HEADERS.slice(0, CHECK_DIRECTION_COLUMN)
const DATA_ROW = ['a', '', '1', 'علی', '100', '', '2026-10-20', 'خیر', '', '', '', '', '']

beforeEach(() => {
  mocks.rows = [OLD_HEADER, DATA_ROW]
  mocks.written = []
  mocks.storage = {}
  mocks.fetchRange.mockClear()
})

describe('migrateCheckDirectionColumn', () => {
  it('appends the header after «ثبت‌کننده» and leaves every data row alone', async () => {
    await migrateCheckDirectionColumn('s1')

    expect(mocks.written).toEqual([CHECKS_HEADERS])
    expect(mocks.rows[0][CHECK_DIRECTION_COLUMN]).toBe(CHECK_DIRECTION_HEADER)
    expect(mocks.rows[1]).toEqual(DATA_ROW)
  })

  it('is idempotent: a second run, even after the flag is lost, writes nothing', async () => {
    await migrateCheckDirectionColumn('s1')
    await migrateCheckDirectionColumn('s1')
    expect(mocks.written).toHaveLength(1)

    mocks.storage = {}
    await migrateCheckDirectionColumn('s1')
    expect(mocks.written).toHaveLength(1)
  })

  it('puts the label at the fixed index even when «پیوست» and «ثبت‌کننده» are missing', async () => {
    mocks.rows = [CHECKS_HEADERS.slice(0, 11), DATA_ROW.slice(0, 11)]

    await migrateCheckDirectionColumn('s1')

    expect(mocks.written[0]).toEqual(CHECKS_HEADERS)
  })

  it('never writes over another label at that index', async () => {
    mocks.rows = [[...OLD_HEADER, 'یادداشت من'], DATA_ROW]

    await migrateCheckDirectionColumn('s1')

    expect(mocks.written).toEqual([])
  })

  it('waits for a tab that has no header yet', async () => {
    mocks.rows = []
    await migrateCheckDirectionColumn('s1')

    expect(mocks.fetchRange).toHaveBeenCalled()
    expect(mocks.written).toEqual([])
    expect(mocks.storage).toEqual({})
  })

  it('remembers each spreadsheet on its own', async () => {
    await migrateCheckDirectionColumn('s1')
    mocks.rows = [OLD_HEADER, DATA_ROW]
    await migrateCheckDirectionColumn('s2')

    expect(mocks.written).toHaveLength(2)
  })
})
