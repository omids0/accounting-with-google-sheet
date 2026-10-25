import { describe, expect, it } from 'vitest'

import { formatImportSummary, parseImportCsv, planImport } from './importPlan'
import { INSTALLMENTS_HEADERS } from './installmentsConstants'
import { validateInstallmentsCsvCells } from './installmentsCsvValidate'
import { rowsToCsv } from '../utils/csv'

describe('a validator inside planImport', () => {
  it('lists the rejected rows with the reason and keeps the good ones', () => {
    const csv = rowsToCsv(INSTALLMENTS_HEADERS, [
      ['a', '', 'وام', '۵۰۰', '12', '5', '۱۴۰۵/۰۸/۰۲'],
      ['b', '', 'وام دوم', 'abc', '12', '5', '2026-10-01'],
      ['c', '', 'وام سوم', '500', '12', '40', '2026-10-01'],
      ['a', '', 'وام', '۵۰۰', '12', '5', '۱۴۰۵/۰۸/۰۲']
    ])

    const plan = planImport({
      ...parseImportCsv(csv, INSTALLMENTS_HEADERS),
      existingIds: [],
      transformRow: cells => {
        validateInstallmentsCsvCells(cells)

        return cells
      }
    })

    expect(plan.rows).toHaveLength(1)
    expect(plan.duplicates).toBe(1)
    expect(plan.invalid.map(row => row.reason)).toEqual([
      'مبلغ قسط عدد نیست',
      'موعد در ماه باید عدد صحیح بین ۱ تا ۳۱ باشد'
    ])
    expect(formatImportSummary(plan)).toContain('ردیف ۳: مبلغ قسط عدد نیست')
  })
})
