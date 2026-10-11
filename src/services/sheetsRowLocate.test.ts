import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CustomForm } from '../types'

const tabs = new Map<string, string[][]>()

vi.mock('./sheetsRows', () => ({
  fetchSheetRangeFromApi: async (_id: string, name: string) => tabs.get(name) ?? []
}))
vi.mock('./sheetsEnsure', () => ({
  getSheetTitles: async () => [...tabs.keys()]
}))
vi.mock('./settings', () => ({
  getSettings: () => ({
    forms: [
      { id: 'f', name: 'هزینه', sheetName: 'هزینه', type: 'expense', fields: [] }
    ] as CustomForm[]
  })
}))

const { resolveRowAnywhere } = await import('./sheetsRowLocate')
const { createRowGuardSession, RowConflictError } = await import('./sheetsRowGuard')

const HEADER = ['شناسه', 'زمان ثبت']

describe('resolveRowAnywhere', () => {
  beforeEach(() => {
    tabs.clear()
    tabs.set('هزینه', [HEADER, ['keep', 't']])
    tabs.set('هزینه 1402', [HEADER, ['x', 't'], ['moved', 't']])
    tabs.set('یادداشت 1402', [HEADER, ['moved', 't']])
  })

  it('finds a row in the form tab first', async () => {
    expect(
      await resolveRowAnywhere(createRowGuardSession(), 'sid', 'هزینه', 2, ['keep', 't'])
    ).toEqual({ sheetName: 'هزینه', rowNumber: 2 })
  })

  it('follows a row that moved into one of the form archives', async () => {
    expect(
      await resolveRowAnywhere(createRowGuardSession(), 'sid', 'هزینه', 5, ['moved', 't'])
    ).toEqual({ sheetName: 'هزینه 1402', rowNumber: 3 })
  })

  it('still reports a conflict when the row is nowhere', async () => {
    await expect(
      resolveRowAnywhere(createRowGuardSession(), 'sid', 'هزینه', 5, ['gone', 't'])
    ).rejects.toBeInstanceOf(RowConflictError)
  })
})
