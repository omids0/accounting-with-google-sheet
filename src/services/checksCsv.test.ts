import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  transform: undefined as ((cells: string[]) => string[] | null) | undefined,
  downloaded: [] as string[],
  headerWrites: [] as string[][],
  baseApply: vi.fn(async () => ({ imported: 1, skipped: 0 })),
  failWrites: false
}))

vi.mock('./sheets', () => ({
  ensureSheetWithHeaders: vi.fn(),
  fetchSheetRows: async (id: string, tab: string) => (getSheetAllRows(id, tab) ?? []).slice(1)
}))
vi.mock('./importExport', () => ({
  importSheetCsv: async (
    _id: string,
    _tab: string,
    _headers: string[],
    _csv: string,
    transform: (cells: string[]) => string[] | null
  ) => {
    mocks.transform = transform

    return { apply: mocks.baseApply }
  },
  newImportId: (raw: string) => raw || 'new-id',
  newImportTimestamp: (raw: string) => raw || 'now'
}))
vi.mock('./sheetsEnsure', () => ({
  writeSheetHeaders: async (_id: string, _tab: string, header: string[]) => {
    if (mocks.failWrites) throw new Error('offline')
    mocks.headerWrites.push(header)
  }
}))
vi.mock('./sheetGrid', () => ({
  withGridGrowth: (_id: string, _tab: string, _r: number, _c: number, write: () => unknown) =>
    write()
}))
vi.mock('../utils/csv', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  downloadTextFile: async (_name: string, text: string) => {
    mocks.downloaded.push(text)

    return 'ok'
  }
}))

const { exportChecksCsv, importChecksCsv } = await import('./checksCsv')
const { CHECK_DIRECTION_COLUMN } = await import('./checkDirection')
const { resetCheckDirectionMigrationSession } = await import('./migrateCheckDirectionColumn')
const { CHECKS_HEADERS } = await import('./sheetHeaders')
const { CHECKS_SHEET } = await import('./sheetNames')
const { clearStore, getSheetAllRows, setSheetAllRows } = await import('./spreadsheetStore')
const { rowsToCsv } = await import('../utils/csv')

const SHEET = 'sheet-csv'
const OWN = CHECKS_HEADERS.slice(0, CHECK_DIRECTION_COLUMN)
const FOREIGN_HEADER = [...OWN, 'یادداشت من', 'نوع چک']

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

/** A file in the app's own export layout. */
const file = (...typeCells: string[]) =>
  rowsToCsv(
    CHECKS_HEADERS,
    typeCells.map((type, index) => cells([type]).map((cell, i) => (i === 0 ? `id${index}` : cell)))
  )

beforeEach(() => {
  clearStore(SHEET)
  setSheetAllRows(SHEET, CHECKS_SHEET, [CHECKS_HEADERS])
  mocks.transform = undefined
  mocks.downloaded = []
  mocks.headerWrites = []
  mocks.failWrites = false
  mocks.baseApply.mockClear()
  resetCheckDirectionMigrationSession()
})

describe('CSV import', () => {
  it('takes the optional type column, and a file without it imports payables', async () => {
    await importChecksCsv(SHEET, file('دریافتی'))

    expect(mocks.transform?.(cells(['دریافتی']))?.[CHECK_DIRECTION_COLUMN]).toBe('دریافتی')
    expect(mocks.transform?.(cells([]).slice(0, 11))?.[CHECK_DIRECTION_COLUMN]).toBe('پرداختی')
  })

  it('writes the type to the labelled column of a tab where the user owns the usual one', async () => {
    setSheetAllRows(SHEET, CHECKS_SHEET, [FOREIGN_HEADER])
    await importChecksCsv(SHEET, file('دریافتی'))

    const row = mocks.transform?.(cells(['دریافتی']))

    expect(row?.[CHECK_DIRECTION_COLUMN]).toBe('')
    expect(row?.[FOREIGN_HEADER.length - 1]).toBe('دریافتی')
  })

  describe('on a legacy tab (no «نوع چک» label)', () => {
    beforeEach(() => setSheetAllRows(SHEET, CHECKS_SHEET, [OWN]))

    it.each(['دريافتي', 'receive', 'دریافـتی', 'چک دریافتی'])(
      'keeps a received check spelled «%s» as received',
      async spelling => {
        const preview = await importChecksCsv(SHEET, file(spelling))
        const row = mocks.transform?.(cells([spelling]))

        // Laid out for the column that is about to be made, not written as a payable.
        expect(row?.[CHECK_DIRECTION_COLUMN]).toBe('دریافتی')
        // Nothing is written to the sheet at preview time.
        expect(mocks.headerWrites).toEqual([])

        await preview.apply()

        expect(mocks.headerWrites).toHaveLength(1)
        expect(mocks.headerWrites[0][CHECK_DIRECTION_COLUMN]).toBe('نوع چک')
        expect(mocks.baseApply).toHaveBeenCalledTimes(1)
      }
    )

    it('adds no column for a file of payables only, and writes them without a type cell', async () => {
      const preview = await importChecksCsv(SHEET, file('پرداختی', ''))

      expect(mocks.transform?.(cells(['پرداختی']))).toHaveLength(12)

      await preview.apply()

      expect(mocks.headerWrites).toEqual([])
      expect(mocks.baseApply).toHaveBeenCalledTimes(1)
    })

    it('imports nothing when the column cannot be made', async () => {
      mocks.failWrites = true

      const preview = await importChecksCsv(SHEET, file('دریافتی'))

      await expect(preview.apply()).rejects.toThrow()
      expect(mocks.baseApply).not.toHaveBeenCalled()
    })

    it('refuses to import when the column it laid the rows out for is no longer the one', async () => {
      const preview = await importChecksCsv(SHEET, file('دریافتی'))

      // Meanwhile the user's own column appeared at the usual place.
      setSheetAllRows(SHEET, CHECKS_SHEET, [[...OWN, 'یادداشت من']])

      await expect(preview.apply()).rejects.toThrow()
      expect(mocks.baseApply).not.toHaveBeenCalled()
    })
  })
})

describe('CSV export', () => {
  it('always has the app’s layout, whichever column the tab keeps the type in', async () => {
    const row = cells(['خصوصی', 'دریافتی'])

    row[0] = 'a'
    setSheetAllRows(SHEET, CHECKS_SHEET, [FOREIGN_HEADER, row])
    await exportChecksCsv(SHEET)

    const lines = mocks.downloaded[0].split(/\r?\n/).filter(Boolean)

    expect(lines[0]).toContain('نوع چک')
    expect(lines[1].split(',')[CHECK_DIRECTION_COLUMN]).toBe('دریافتی')
    expect(lines[1]).not.toContain('خصوصی')
  })
})
