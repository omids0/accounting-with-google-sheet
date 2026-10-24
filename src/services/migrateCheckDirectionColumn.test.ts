import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  rows: [] as string[][],
  written: [] as string[][],
  storage: {} as Record<string, unknown>,
  fetchRange: vi.fn(async () => [] as string[][]),
  failWrites: false,
  /** Runs inside the header write, like another device's pull landing meanwhile. */
  duringWrite: undefined as (() => void) | undefined
}))

vi.mock('./sheetsEnsure', () => ({
  writeSheetHeaders: async (_id: string, _tab: string, header: string[]) => {
    mocks.written.push(header)
    mocks.duringWrite?.()
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
  getSheetRow: (_id: string, _tab: string, row: number) => mocks.rows[row - 1] ?? null,
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

const {
  checkDirectionColumnForWrite,
  ensureCheckDirectionColumn,
  findFreeDirectionColumn,
  migrateCheckDirectionColumn,
  predictCheckDirectionColumn,
  resetCheckDirectionMigrationSession
} = await import('./migrateCheckDirectionColumn')
const { CHECK_DIRECTION_COLUMN, CHECK_DIRECTION_HEADER } = await import('./checkDirection')
const { CHECKS_HEADERS } = await import('./sheetHeaders')

const OWN = CHECKS_HEADERS.slice(0, CHECK_DIRECTION_COLUMN)
const ROW = ['a', '', '1', 'علی', '100', '', '2026-10-20', 'خیر', '', '', '', '', '']

beforeEach(() => {
  mocks.rows = [OWN, ROW]
  mocks.written = []
  mocks.storage = {}
  mocks.failWrites = false
  mocks.duringWrite = undefined
  mocks.fetchRange.mockClear()
  resetCheckDirectionMigrationSession()
})

describe('findFreeDirectionColumn', () => {
  it('takes the usual place when its header and cells are empty', () => {
    expect(findFreeDirectionColumn([OWN, ROW])).toBe(CHECK_DIRECTION_COLUMN)
    expect(findFreeDirectionColumn([OWN.slice(0, 11), ROW.slice(0, 11)])).toBe(
      CHECK_DIRECTION_COLUMN
    )
  })

  it('skips a column with a label of the user’s own', () => {
    expect(findFreeDirectionColumn([[...OWN, 'یادداشت من'], ROW])).toBe(CHECK_DIRECTION_COLUMN + 1)
  })

  it('skips a column that has data under a blank header', () => {
    expect(findFreeDirectionColumn([OWN, [...ROW, '۱۲۳']])).toBe(CHECK_DIRECTION_COLUMN + 1)
  })

  it('skips every taken column in a row of them', () => {
    const rows = [
      [...OWN, 'الف', '', 'ج'],
      [...ROW, '', 'x']
    ]

    expect(findFreeDirectionColumn(rows)).toBe(CHECK_DIRECTION_COLUMN + 3)
  })
})

describe('ensureCheckDirectionColumn', () => {
  it('adds the label at the usual place and leaves every data row alone', async () => {
    expect(await ensureCheckDirectionColumn('s1')).toBe(CHECK_DIRECTION_COLUMN)

    expect(mocks.written).toEqual([CHECKS_HEADERS])
    expect(mocks.rows[0][CHECK_DIRECTION_COLUMN]).toBe(CHECK_DIRECTION_HEADER)
    expect(mocks.rows[1]).toEqual(ROW)
  })

  it('puts it after a foreign label and never writes over it', async () => {
    mocks.rows = [[...OWN, 'یادداشت من'], ROW]

    expect(await ensureCheckDirectionColumn('s1')).toBe(CHECK_DIRECTION_COLUMN + 1)
    expect(mocks.written[0][CHECK_DIRECTION_COLUMN]).toBe('یادداشت من')
    expect(mocks.written[0][CHECK_DIRECTION_COLUMN + 1]).toBe(CHECK_DIRECTION_HEADER)
  })

  it('puts it after data that sits under a blank header', async () => {
    mocks.rows = [OWN, [...ROW, 'داده من']]

    expect(await ensureCheckDirectionColumn('s1')).toBe(CHECK_DIRECTION_COLUMN + 1)
    expect(mocks.written[0][CHECK_DIRECTION_COLUMN]).toBe('')
    expect(mocks.rows[1][CHECK_DIRECTION_COLUMN]).toBe('داده من')
  })

  it('fills the app’s own labels an older tab lacks, but only those', async () => {
    mocks.rows = [CHECKS_HEADERS.slice(0, 11), ROW.slice(0, 11)]

    await ensureCheckDirectionColumn('s1')

    expect(mocks.written[0]).toEqual(CHECKS_HEADERS)
  })

  it('finds the label wherever it already is, and writes nothing', async () => {
    mocks.rows = [[...OWN, 'یادداشت من', CHECK_DIRECTION_HEADER], ROW]

    expect(await ensureCheckDirectionColumn('s1')).toBe(CHECK_DIRECTION_COLUMN + 1)
    expect(mocks.written).toEqual([])
  })

  it('is idempotent, flag or no flag', async () => {
    await ensureCheckDirectionColumn('s1')
    mocks.storage = {}
    await ensureCheckDirectionColumn('s1')

    expect(mocks.written).toHaveLength(1)
  })

  it('shares one attempt between concurrent callers', async () => {
    await Promise.all([ensureCheckDirectionColumn('s1'), ensureCheckDirectionColumn('s1')])

    expect(mocks.written).toHaveLength(1)
  })

  it('keeps the rows the mirror holds after the write, not the ones read before it', async () => {
    mocks.duringWrite = () => {
      mocks.rows = [mocks.rows[0], ROW, ['b', ...ROW.slice(1)]]
    }
    await ensureCheckDirectionColumn('s1')

    expect(mocks.rows).toHaveLength(3)
    expect(mocks.rows[0][CHECK_DIRECTION_COLUMN]).toBe(CHECK_DIRECTION_HEADER)
  })

  it('keeps the user’s columns to the right of the new label in the mirror’s header', async () => {
    mocks.rows = [[...OWN, '', 'ستون من'], ROW]

    expect(await ensureCheckDirectionColumn('s1')).toBe(CHECK_DIRECTION_COLUMN)
    expect(mocks.written[0]).toEqual([...OWN, CHECK_DIRECTION_HEADER])
    expect(mocks.rows[0]).toEqual([...OWN, CHECK_DIRECTION_HEADER, 'ستون من'])
  })

  it('waits for a tab that has no header yet', async () => {
    mocks.rows = []

    expect(await ensureCheckDirectionColumn('s1')).toBe(-1)
    expect(mocks.written).toEqual([])
    expect(mocks.storage).toEqual({})
  })
})

describe('migrateCheckDirectionColumn', () => {
  it('runs once per spreadsheet and remembers each on its own', async () => {
    await migrateCheckDirectionColumn('s1')
    await migrateCheckDirectionColumn('s1')
    mocks.rows = [OWN, ROW]
    await migrateCheckDirectionColumn('s2')

    expect(mocks.written).toHaveLength(2)
  })

  it('does not try again in the same session after a failure, and never throws', async () => {
    mocks.failWrites = true

    await expect(migrateCheckDirectionColumn('s1')).resolves.toBeUndefined()
    await migrateCheckDirectionColumn('s1')

    expect(mocks.written).toHaveLength(1)
    expect(mocks.storage).toEqual({})
  })

  it('tries again in a new session', async () => {
    mocks.failWrites = true
    await migrateCheckDirectionColumn('s1')
    resetCheckDirectionMigrationSession()
    mocks.failWrites = false
    await migrateCheckDirectionColumn('s1')

    expect(mocks.written).toHaveLength(2)
  })
})

describe('checkDirectionColumnForWrite', () => {
  it('lets a payable go without the column, and never touches the sheet for it', async () => {
    expect(await checkDirectionColumnForWrite('s1', 'paid')).toBe(-1)
    expect(mocks.written).toEqual([])
  })

  it('makes the column for a received check', async () => {
    expect(await checkDirectionColumnForWrite('s1', 'received')).toBe(CHECK_DIRECTION_COLUMN)
  })

  it('fails the save of a received check when the column cannot be made', async () => {
    mocks.failWrites = true

    await expect(checkDirectionColumnForWrite('s1', 'received')).rejects.toThrow()
  })

  it('says the first received check needs the network when the header cannot be written', async () => {
    mocks.failWrites = true

    await expect(checkDirectionColumnForWrite('s1', 'received')).rejects.toThrow('اینترنت')
  })

  it('answers from the header it already has', async () => {
    mocks.rows = [CHECKS_HEADERS, ROW]

    expect(await checkDirectionColumnForWrite('s1', 'received')).toBe(CHECK_DIRECTION_COLUMN)
    expect(mocks.written).toEqual([])
  })
})

describe('predictCheckDirectionColumn', () => {
  it('names the column ensure would use, without writing anything', () => {
    mocks.rows = [[...OWN, 'یادداشت من'], ROW]

    expect(predictCheckDirectionColumn('s1')).toBe(CHECK_DIRECTION_COLUMN + 1)
    expect(mocks.written).toEqual([])
  })

  it('names the labelled column when there is one, and -1 without a header', () => {
    mocks.rows = [[...OWN, 'یادداشت من', CHECK_DIRECTION_HEADER], ROW]
    expect(predictCheckDirectionColumn('s1')).toBe(CHECK_DIRECTION_COLUMN + 1)

    mocks.rows = []
    expect(predictCheckDirectionColumn('s1')).toBe(-1)
  })
})
