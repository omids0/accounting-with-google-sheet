import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  transform: undefined as ((cells: string[]) => string[] | null) | undefined
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

    return { apply: vi.fn() }
  },
  exportSheetCsv: vi.fn(),
  newImportId: (raw: string) => raw || 'new-id',
  newImportTimestamp: (raw: string) => raw || 'now'
}))
vi.mock('./sheets', () => ({
  ensureSheetWithHeaders: vi.fn(),
  fetchSheetRows: async () => []
}))
vi.mock('../utils/pdf', () => ({ downloadTablePdf: vi.fn() }))

const { importChecksCsv } = await import('./checksCsv')
const { importInstallmentsCsv } = await import('./installmentsExport')
const { importReceivablesCsv } = await import('./receivablesExport')
const { withoutRecordIds } = await import('../utils/importRecordIds')

beforeEach(() => {
  mocks.transform = undefined
})

describe('withoutRecordIds', () => {
  it('keeps everything of a payment but the record id', () => {
    expect(
      withoutRecordIds([{ id: 'p1', amount: 5, transactionRecordId: 'rec-x' }, { id: 'p2' }])
    ).toEqual([{ id: 'p1', amount: 5 }, { id: 'p2' }])
  })
})

describe('CSV import drops the record ids of the workbook the file came from (N8)', () => {
  it('a paid check imports without its record id (two copies must not share one record)', async () => {
    await importChecksCsv('sid', 'x')

    const cells = ['c1', '', '55', 'علی', '100', '2026-10-01', '2026-10-20', 'بله', '2026-10-05']

    cells[9] = 'rec-foreign'

    const row = mocks.transform?.([...cells, '', '', '', '', ''])

    expect(row?.[7]).toBe('بله')
    expect(row?.[9]).toBe('')
    expect(row?.join('|')).not.toContain('rec-foreign')
  })

  it('an installment book imports its paid instalments without their record ids', async () => {
    await importInstallmentsCsv('sid', 'x')

    const payments = JSON.stringify([
      {
        n: 1,
        paid: true,
        paidAt: '2026-08-05',
        dueDate: '2026-08-05',
        amount: 100,
        transactionRecordId: 'rec-foreign'
      },
      { n: 2, paid: false, paidAt: '', dueDate: '2026-09-05', amount: 100 }
    ])
    const row = mocks.transform?.([
      'p1',
      '',
      'وام',
      '100',
      '2',
      '5',
      '2026-08-01',
      '',
      payments,
      ''
    ])

    expect(row?.join('|')).not.toContain('rec-foreign')
    expect(row?.join('|')).toContain('"paid":true')
  })

  it('a receivable imports its payments without their record ids', async () => {
    await importReceivablesCsv('sid', 'x')

    const payments = JSON.stringify([
      { id: 'p1', amount: 50, paidAt: '2026-10-01', note: '', transactionRecordId: 'rec-foreign' }
    ])
    const row = mocks.transform?.([
      'x1',
      '',
      'وام',
      'رضا',
      'دوستان',
      '100',
      '2026-09-01',
      '',
      payments
    ])

    expect(row?.join('|')).not.toContain('rec-foreign')
    expect(row?.join('|')).toContain('"amount":50')
  })
})
