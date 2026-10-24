import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  replaced: [] as { rows: string[][]; width: number }[],
  appended: [] as string[][][],
  headerWrites: [] as string[][]
}))

vi.mock('./backupExport', () => ({
  sendPendingWrites: async () => undefined,
  fetchTabsByTitle: async () => new Map<string, string[][]>()
}))
vi.mock('./archiveTabs', () => ({ prepareArchiveTab: vi.fn(), readTabs: vi.fn() }))
vi.mock('./archiveRegistry', () => ({ addArchiveTab: vi.fn() }))
vi.mock('./sheetsEnsure', () => ({
  ensureManySheetsWithHeaders: vi.fn(async () => undefined),
  writeSheetHeaders: async (_id: string, _tab: string, header: string[]) => {
    mocks.headerWrites.push(header)
  }
}))
vi.mock('./sheetGrid', () => ({
  withGridGrowth: (_id: string, _tab: string, _r: number, _c: number, write: () => unknown) =>
    write()
}))
vi.mock('./sheetsOutboxApi', () => ({
  replaceSheetDataRowsApi: async (_id: string, _tab: string, rows: string[][], width: number) => {
    mocks.replaced.push({ rows, width })
  },
  appendSheetRowsApi: async (_id: string, _tab: string, rows: string[][]) => {
    mocks.appended.push(rows)
  }
}))
vi.mock('./sheetRevisions', () => ({
  stampSheetRevisions: async () => undefined,
  forgetSeenSheets: vi.fn()
}))
vi.mock('./sheetsRows', () => ({
  batchFetchSheetRangesFromApi: async () => new Map(),
  fetchSheetRangeFromApi: async () => []
}))
vi.mock('./sheetSyncOutbox', () => ({ invalidateDerivedCaches: vi.fn() }))
vi.mock('./spreadsheetDataChange', () => ({ notifySpreadsheetDataChanged: vi.fn() }))

const { runRestore } = await import('./backupRestore')
const { CHECK_DIRECTION_COLUMN } = await import('./checkDirection')
const { resetCheckDirectionMigrationSession } = await import('./migrateCheckDirectionColumn')
const { CHECKS_HEADERS } = await import('./sheetHeaders')
const { CHECKS_SHEET } = await import('./sheetNames')
const { clearStore, setSheetAllRows } = await import('./spreadsheetStore')
const { rowsToCsv } = await import('../utils/csv')

const SHEET = 'sheet-restore'
const OWN = CHECKS_HEADERS.slice(0, CHECK_DIRECTION_COLUMN)
/** The user's own column sits where the app would put the type. */
const FOREIGN_HEADER = [...OWN, 'یادداشت من', 'نوع چک']

const backupRow = (id: string, type: string) => [
  id,
  '',
  '1',
  'علی',
  '100',
  '',
  '2026-10-20',
  'خیر',
  '',
  '',
  '',
  'att',
  'me@x.com',
  type
]

const preview = (header: string[], rows: string[][]) => ({
  manifest: {} as never,
  unknownTabs: [],
  tabs: [
    {
      name: CHECKS_SHEET,
      csv: rowsToCsv(header, rows),
      rows: rows.length,
      headers: CHECKS_HEADERS,
      archive: false
    }
  ]
})

beforeEach(() => {
  localStorage.clear()
  clearStore(SHEET)
  mocks.replaced = []
  mocks.appended = []
  mocks.headerWrites = []
  resetCheckDirectionMigrationSession()
})

describe('restoring the checks tab', () => {
  it('moves the backup’s type into the target’s type column, not over the user’s own column', async () => {
    setSheetAllRows(SHEET, CHECKS_SHEET, [FOREIGN_HEADER, ['old']])

    await runRestore(
      SHEET,
      preview(CHECKS_HEADERS, [backupRow('a', 'دریافتی'), backupRow('b', 'پرداختی')]),
      'replace',
      () => undefined
    )

    const { rows, width } = mocks.replaced[0]

    expect(width).toBe(FOREIGN_HEADER.length)
    expect(rows.map(row => row[CHECK_DIRECTION_COLUMN])).toEqual(['', ''])
    expect(rows.map(row => row[FOREIGN_HEADER.length - 1])).toEqual(['دریافتی', 'پرداختی'])
    expect(rows.every(row => row.length === width)).toBe(true)
    // The app's own cells survive the move.
    expect(rows[0].slice(0, 13)).toEqual(backupRow('a', '').slice(0, 13))
  })

  it('creates the type column on a legacy target when a restored check is received', async () => {
    setSheetAllRows(SHEET, CHECKS_SHEET, [OWN, ['old']])

    await runRestore(
      SHEET,
      preview(CHECKS_HEADERS, [backupRow('a', 'دريافتي')]),
      'replace',
      () => undefined
    )

    expect(mocks.headerWrites[0][CHECK_DIRECTION_COLUMN]).toBe('نوع چک')
    expect(mocks.replaced[0].rows[0][CHECK_DIRECTION_COLUMN]).toBe('دریافتی')
  })

  it('does not make a column for payables, and clears an old one beyond the backup', async () => {
    setSheetAllRows(SHEET, CHECKS_SHEET, [OWN, ['old']])

    await runRestore(
      SHEET,
      preview(CHECKS_HEADERS, [backupRow('a', 'پرداختی')]),
      'replace',
      () => undefined
    )

    expect(mocks.headerWrites).toEqual([])
    // The backup's type cell is not carried over into a column the tab does not have.
    expect((mocks.replaced[0].rows[0][CHECK_DIRECTION_COLUMN] ?? '') === '').toBe(true)
    expect(mocks.replaced[0].width).toBe(OWN.length)
  })

  it('reads a backup from before the column as payables and pads to the target’s width', async () => {
    setSheetAllRows(SHEET, CHECKS_SHEET, [FOREIGN_HEADER])

    await runRestore(
      SHEET,
      preview(OWN, [backupRow('a', '').slice(0, 13)]),
      'replace',
      () => undefined
    )

    const { rows, width } = mocks.replaced[0]

    expect(width).toBe(FOREIGN_HEADER.length)
    expect(rows[0]).toHaveLength(width)
    expect(rows[0][width - 1]).toBe('پرداختی')
  })

  it('merge mode remaps the appended rows the same way', async () => {
    setSheetAllRows(SHEET, CHECKS_SHEET, [FOREIGN_HEADER])

    await runRestore(
      SHEET,
      preview(CHECKS_HEADERS, [backupRow('a', 'دریافتی')]),
      'merge',
      () => undefined
    )

    const [row] = mocks.appended[0]

    expect(row[CHECK_DIRECTION_COLUMN]).toBe('')
    expect(row[FOREIGN_HEADER.length - 1]).toBe('دریافتی')
  })
})
