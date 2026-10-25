import { beforeEach, describe, expect, it, vi } from 'vitest'

import { loadCategoryTreeReport } from './categoryTreeReport'
import { getDefaultSettings, saveSettings } from './settings'
import { setWorkspaceType } from './workspace'
import type { CustomForm } from '../types'

vi.mock('./sheets', () => ({
  fetchRecords: vi.fn(async (_id: string, form: CustomForm) =>
    form.type === 'expense'
      ? [
          {
            id: 'e1',
            createdAt: '',
            values: { date: '2026-10-20', category: 'خوراک', amount: '300' }
          },
          {
            id: 's1',
            createdAt: '',
            values: { date: '2026-10-21', category: 'تسویه', amount: '900' }
          }
        ]
      : []
  )
}))

const range = { start: '2026-10-01', end: '2026-10-31' }

describe('loadCategoryTreeReport', () => {
  beforeEach(() => {
    localStorage.clear()
    setWorkspaceType('shared-1', 'shared')
  })

  it('leaves a shared account’s «تسویه» out of the category tree', async () => {
    saveSettings({ ...getDefaultSettings(), spreadsheetId: 'shared-1' })

    const report = await loadCategoryTreeReport('shared-1', range)

    expect(report.nodes.map(node => node.category)).toEqual(['خوراک'])
    expect(report.expenseTotal).toBe(300)
  })

  it('keeps a personal category named «تسویه»', async () => {
    saveSettings({ ...getDefaultSettings(), spreadsheetId: 'personal-1' })

    const report = await loadCategoryTreeReport('personal-1', range)

    expect(report.expenseTotal).toBe(1200)
  })
})
