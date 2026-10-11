import { describe, expect, it } from 'vitest'

import type { CustomForm } from '../types'
import {
  ARCHIVE_THRESHOLD_ROWS,
  archiveSheetName,
  parseArchiveSheetName,
  planYearSweep
} from './recordArchive'
import { buildHeaders } from './sheetsHeaders'

const EXPENSE: CustomForm = {
  id: 'form_expense',
  name: 'هزینه',
  sheetName: 'هزینه',
  type: 'expense',
  fields: [
    { id: 'date', label: 'تاریخ', type: 'date', required: true },
    { id: 'amount', label: 'مبلغ', type: 'number', required: true }
  ]
}

const ODD: CustomForm = { ...EXPENSE, id: 'odd', name: 'odd', sheetName: 'هزینه 1404' }

const HEADER = buildHeaders(EXPENSE.fields)

function row(id: string, date: string): string[] {
  return [id, '2025-01-01T00:00:00Z', date, '1000']
}

/** `count` rows dated in Gregorian 2025, i.e. Jalali 1403/1404. */
function filler(count: number, date = '2025-06-01'): string[][] {
  return Array.from({ length: count }, (_, i) => row(`f${i}`, date))
}

describe('archive names', () => {
  it('round-trips a form tab and year', () => {
    expect(archiveSheetName('هزینه', 1403)).toBe('هزینه 1403')
    expect(parseArchiveSheetName('هزینه 1403', [EXPENSE])).toEqual({ form: EXPENSE, year: 1403 })
  })

  it('ignores tabs that are not a configured form plus a year', () => {
    expect(parseArchiveSheetName('شیت من 1403', [EXPENSE])).toBeNull()
    expect(parseArchiveSheetName('هزینه ۱۴۰۳', [EXPENSE])).toBeNull()
    expect(parseArchiveSheetName('هزینه 99', [EXPENSE])).toBeNull()
    expect(parseArchiveSheetName('هزینه', [EXPENSE])).toBeNull()
  })

  it('never treats a configured form tab as an archive', () => {
    expect(parseArchiveSheetName('هزینه 1404', [EXPENSE, ODD])).toBeNull()
  })
})

describe('planYearSweep', () => {
  it('does nothing while the tab is at or under the threshold', () => {
    const rows = [HEADER, row('old', '2020-05-01'), ...filler(ARCHIVE_THRESHOLD_ROWS - 1)]

    expect(planYearSweep(rows, EXPENSE, 1404)).toBeNull()
  })

  it('groups past-year rows by Jalali year once the tab is over the threshold', () => {
    const rows = [
      HEADER,
      row('a', '2020-05-01'), // 1399
      row('b', '2021-03-20'), // 1399/12/29
      row('c', '2021-03-21'), // 1400/01/01
      row('d', ''),
      row('e', 'not a date'),
      ...filler(ARCHIVE_THRESHOLD_ROWS, '2025-06-01') // 1404
    ]

    const plan = planYearSweep(rows, EXPENSE, 1404)!

    expect([...plan.keys()].sort()).toEqual([1399, 1400])
    expect(plan.get(1399)!.map(i => rows[i][0])).toEqual(['a', 'b'])
    expect(plan.get(1400)!.map(i => rows[i][0])).toEqual(['c'])
  })

  it('returns null when every row is current, future or undated', () => {
    const rows = [HEADER, row('x', '2027-01-01'), ...filler(ARCHIVE_THRESHOLD_ROWS + 1)]

    expect(planYearSweep(rows, EXPENSE, 1404)).toBeNull()
  })
})

describe('listArchiveSheets', () => {
  it('keeps only archive tabs of configured forms', async () => {
    const { listArchiveSheets } = await import('./recordArchive')

    expect(
      listArchiveSheets(
        ['هزینه', 'هزینه 1402', 'درآمد 1402', 'یادداشت 1401', 'هزینه 1403'],
        [EXPENSE]
      )
    ).toEqual(['هزینه 1402', 'هزینه 1403'])
  })
})

describe('planYearSweep without a header row', () => {
  it('never plans a sweep, since the first row would be taken as the header', () => {
    const rows = [row('old', '2020-05-01'), ...filler(ARCHIVE_THRESHOLD_ROWS + 1)]

    expect(planYearSweep(rows, EXPENSE, 1404)).toBeNull()
  })
})
