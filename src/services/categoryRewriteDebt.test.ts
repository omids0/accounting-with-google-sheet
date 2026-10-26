import { beforeEach, describe, expect, it, vi } from 'vitest'

import { collectCategoryRewrites } from './categoryRewrite'
import { getDefaultSettings, saveSettings } from './settings'
import { setWorkspaceType } from './workspace'

const { fetchRecords, updateRecord, fetchDangs, updateDang } = vi.hoisted(() => ({
  fetchRecords: vi.fn(),
  updateRecord: vi.fn(async () => undefined),
  fetchDangs: vi.fn(),
  updateDang: vi.fn(async () => undefined)
}))

vi.mock('./sheets', () => ({ fetchRecords, updateRecord }))
vi.mock('./dang', () => ({ fetchDangs, updateDang }))

function record(rowNumber: number, category: string, subCategory: string) {
  return {
    id: `r${rowNumber}`,
    rowNumber,
    createdAt: '2026-01-01',
    sheetName: 'هزینه',
    values: { category, subCategory, amount: '10' }
  }
}

const RECORDS = [
  record(2, 'بدهی', 'دنگ'),
  record(3, 'بدهی', 'قرض'),
  record(4, 'بدهی', ''),
  record(5, 'خوراک', 'دنگ'),
  record(6, 'بدهی: دنگ', ''),
  record(7, 'دنگ', 'دنگ')
]

async function run(tasks: (() => Promise<void>)[]) {
  for (const task of tasks) await task()
}

describe('renaming or merging a debt category', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    setWorkspaceType('building-1', 'building')
    saveSettings({ ...getDefaultSettings(), spreadsheetId: 'personal-1' })
    fetchRecords.mockResolvedValue(RECORDS)
    fetchDangs.mockResolvedValue([
      { rowNumber: 2, category: 'دنگ', title: 'الف', amount: 5, paid: false, payments: [] },
      { rowNumber: 3, category: 'قرض', title: 'ب', amount: 5, paid: false, payments: [] }
    ])
  })

  it('also rewrites the subcategory of the expense records filed under «بدهی»', async () => {
    const tasks = await collectCategoryRewrites(
      'personal-1',
      'dang',
      { category: 'دنگ' },
      { category: 'گروهی' }
    )

    expect(tasks).toHaveLength(2)
    await run(tasks)

    expect(updateDang).toHaveBeenCalledTimes(1)
    expect(updateRecord).toHaveBeenCalledTimes(1)

    const [, , row, , , values] = updateRecord.mock.calls[0] as unknown as [
      string,
      unknown,
      number,
      string,
      string,
      Record<string, string>
    ]

    expect(row).toBe(2)
    expect(values).toMatchObject({ category: 'بدهی', subCategory: 'گروهی', amount: '10' })
  })

  it('leaves records of other categories and legacy «بدهی: …» names untouched', async () => {
    const tasks = await collectCategoryRewrites(
      'personal-1',
      'dang',
      { category: 'دنگ' },
      { category: 'گروهی' }
    )

    await run(tasks)

    const rows = updateRecord.mock.calls.map(call => (call as unknown as unknown[])[2])

    expect(rows).toEqual([2])
  })

  it('counts those payment records for a delete or a merge confirm', async () => {
    const tasks = await collectCategoryRewrites(
      'personal-1',
      'dang',
      { category: 'قرض' },
      { category: 'قرض' }
    )

    expect(tasks).toHaveLength(2)
  })

  it('does not touch expense records when only a debt subcategory changes', async () => {
    const tasks = await collectCategoryRewrites(
      'personal-1',
      'dang',
      { category: 'دنگ', subCategory: 'الف' },
      { category: 'دنگ', subCategory: 'ب' }
    )

    expect(fetchRecords).not.toHaveBeenCalled()
    expect(tasks.length).toBeLessThanOrEqual(1)
  })

  it('leaves the expense ledger of a building alone', async () => {
    saveSettings({ ...getDefaultSettings(), spreadsheetId: 'building-1' })

    const tasks = await collectCategoryRewrites(
      'building-1',
      'dang',
      { category: 'دنگ' },
      { category: 'گروهی' }
    )

    expect(fetchRecords).not.toHaveBeenCalled()
    expect(tasks).toHaveLength(1)
  })
})
