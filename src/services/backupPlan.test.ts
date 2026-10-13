import { describe, expect, it } from 'vitest'

import { mergeRowKey, planTabRestore, tabToBackupCsv } from './backupPlan'
import { CATEGORIES_SHEET, CHECKS_SHEET } from './sheetNames'

const header = ['شناسه', 'زمان ثبت', 'عنوان', 'مبلغ']

const rows = [
  ['c1', '1405/07/01', 'اجاره, خانه', '-1500000'],
  ['c2', '1405/07/02', 'نقل "قول"\nخط دوم', '=SUM(A1)'],
  ['c3', '', '', '0912']
]

describe('tab CSV round-trip', () => {
  it('restores exactly the rows that were backed up', () => {
    const { csv, rows: count } = tabToBackupCsv([header, ...rows, ['', '']], header)

    expect(count).toBe(3)

    const plan = planTabRestore({ sheetName: CHECKS_SHEET, csv, mode: 'replace' })

    expect(plan.header).toEqual(header)
    expect(plan.rows).toEqual(rows)
    expect(plan.duplicates).toBe(0)
  })

  it('uses the registry headers for an empty or missing tab', () => {
    const { csv, rows: count } = tabToBackupCsv([], header)

    expect(count).toBe(0)
    expect(planTabRestore({ sheetName: CHECKS_SHEET, csv, mode: 'replace' }).header).toEqual(header)
  })
})

describe('restore modes', () => {
  const { csv } = tabToBackupCsv([header, ...rows, rows[0]], header)

  it('replace writes every row of the backup, repeats included', () => {
    const plan = planTabRestore({
      sheetName: CHECKS_SHEET,
      csv,
      mode: 'replace',
      existingRows: [['c1', 'x']]
    })

    expect(plan.rows).toHaveLength(4)
  })

  it('merge skips ids already in the tab and repeats inside the file', () => {
    const plan = planTabRestore({
      sheetName: CHECKS_SHEET,
      csv,
      mode: 'merge',
      existingRows: [
        ['c1', 'older copy'],
        ['', '']
      ]
    })

    expect(plan.rows.map(row => row[0])).toEqual(['c2', 'c3'])
    expect(plan.duplicates).toBe(2)
  })

  it('merge compares whole rows on the categories tab', () => {
    const catHeader = ['نوع', 'دسته‌بندی', 'زیردسته']
    const { csv: categories } = tabToBackupCsv(
      [catHeader, ['هزینه', 'خوراک', ''], ['هزینه', 'خودرو', 'بنزین']],
      catHeader
    )

    const plan = planTabRestore({
      sheetName: CATEGORIES_SHEET,
      csv: categories,
      mode: 'merge',
      existingRows: [['هزینه', 'خوراک']]
    })

    expect(plan.rows).toEqual([['هزینه', 'خودرو', 'بنزین']])

    const key = mergeRowKey(CATEGORIES_SHEET)

    expect(key(['a', 'b', ''])).toBe(key(['a', 'b']))
  })
})
