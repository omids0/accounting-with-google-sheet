import { describe, expect, it } from 'vitest'

import { newImportId } from './importExport'
import {
  formatImportSummary,
  INVALID_IMPORT_ROW_REASON,
  parseImportCsv,
  planImport,
  type ImportRowTransform
} from './importPlan'

const HEADERS = ['شناسه', 'عنوان', 'مبلغ']

/** Same shape as the module transforms: title required, id kept or generated. */
const transformRow: ImportRowTransform = cells => {
  const title = (cells[1] ?? '').trim()

  if (!title) return null
  if (cells[2] && Number.isNaN(Number(cells[2]))) throw new Error('مبلغ عدد نیست')

  return [newImportId(cells[0] ?? ''), title, cells[2] ?? '']
}

function plan(csv: string, existingIds: string[] = []) {
  return planImport({ ...parseImportCsv(csv, HEADERS), existingIds, transformRow })
}

describe('parseImportCsv', () => {
  it('skips a header row and numbers data from line 2', () => {
    expect(parseImportCsv('شناسه,عنوان,مبلغ\na,نان,10', HEADERS)).toEqual({
      dataRows: [['a', 'نان', '10']],
      firstLine: 2
    })
  })

  it('treats a file without headers as data from line 1', () => {
    expect(parseImportCsv('a,نان,10', HEADERS).firstLine).toBe(1)
  })

  it('rejects an empty file', () => {
    expect(() => parseImportCsv('', HEADERS)).toThrow('فایل خالی است')
  })
})

describe('planImport', () => {
  it('skips ids that already exist in the sheet', () => {
    const result = plan('شناسه,عنوان,مبلغ\na,نان,10\nb,شیر,20', ['a'])

    expect(result.found).toBe(2)
    expect(result.duplicates).toBe(1)
    expect(result.rows.map(row => row[0])).toEqual(['b'])
  })

  it('keeps only the first of the same id repeated in the file', () => {
    const result = plan('a,نان,10\na,نان دوباره,10\nb,شیر,20')

    expect(result.duplicates).toBe(1)
    expect(result.rows.map(row => row[1])).toEqual(['نان', 'شیر'])
  })

  it('gives rows without an id distinct new ids that never count as duplicates', () => {
    const result = plan(',نان,10\n,شیر,20', ['a'])

    expect(result.duplicates).toBe(0)
    expect(result.rows).toHaveLength(2)

    const [first, second] = result.rows.map(row => row[0])

    expect(first).toBeTruthy()
    expect(second).toBeTruthy()
    expect(first).not.toBe(second)
  })

  it('reports invalid rows with their file line and reason', () => {
    const result = plan('شناسه,عنوان,مبلغ\na,نان,10\nb,,20\nc,شیر,ده')

    expect(result.invalid).toEqual([
      { line: 3, reason: INVALID_IMPORT_ROW_REASON },
      { line: 4, reason: 'مبلغ عدد نیست' }
    ])
    expect(result.rows).toHaveLength(1)
  })

  it('ignores blank rows entirely', () => {
    const result = plan('a,نان,10\n,,\n\nb,شیر,20')

    expect(result.found).toBe(2)
    expect(result.invalid).toEqual([])
  })
})

describe('formatImportSummary', () => {
  it('counts found, duplicate and invalid rows and lists the reasons', () => {
    const summary = formatImportSummary(plan('شناسه,عنوان,مبلغ\na,نان,10\nb,,20\nc,شیر,10', ['c']))

    expect(summary).toBe(
      [
        '۳ ردیف پیدا شد؛ ۱ تکراری (رد می‌شود)؛ ۱ نامعتبر (ردیف ۳)',
        '',
        `ردیف ۳: ${INVALID_IMPORT_ROW_REASON}`
      ].join('\n')
    )
  })

  it('says when nothing new is left to add', () => {
    expect(formatImportSummary(plan('a,نان,10', ['a']))).toContain('ردیف تازه‌ای برای افزودن نیست.')
  })
})
