import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  transform: undefined as ((cells: string[]) => string[] | null) | undefined,
  downloaded: [] as string[]
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
  },
  newImportId: (raw: string) => raw || 'new-id',
  newImportTimestamp: (raw: string) => raw || 'now'
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
const { CHECKS_HEADERS } = await import('./sheetHeaders')
const { CHECKS_SHEET } = await import('./sheetNames')
const { clearStore, getSheetAllRows, setSheetAllRows } = await import('./spreadsheetStore')

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

beforeEach(() => {
  clearStore(SHEET)
  setSheetAllRows(SHEET, CHECKS_SHEET, [CHECKS_HEADERS])
  mocks.transform = undefined
  mocks.downloaded = []
})

describe('CSV import', () => {
  it('takes the optional type column, and a file without it imports payables', async () => {
    await importChecksCsv(SHEET, 'دریافتی')

    expect(mocks.transform?.(cells(['دریافتی']))?.[CHECK_DIRECTION_COLUMN]).toBe('دریافتی')
    expect(mocks.transform?.(cells([]).slice(0, 11))?.[CHECK_DIRECTION_COLUMN]).toBe('پرداختی')
  })

  it('writes the type to the labelled column of a tab where the user owns the usual one', async () => {
    setSheetAllRows(SHEET, CHECKS_SHEET, [FOREIGN_HEADER])
    await importChecksCsv(SHEET, 'دریافتی')

    const row = mocks.transform?.(cells(['دریافتی']))

    expect(row?.[CHECK_DIRECTION_COLUMN]).toBe('')
    expect(row?.[FOREIGN_HEADER.length - 1]).toBe('دریافتی')
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
