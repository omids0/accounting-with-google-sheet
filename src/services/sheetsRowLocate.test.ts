import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CustomForm } from '../types'

const tabs = new Map<string, string[][]>()

const revisions = new Map<string, { title: string; archive: boolean }>()

vi.mock('./sheetRevisions', () => ({ fetchSheetRevisions: async () => revisions }))

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
const { initStore } = await import('./spreadsheetStore')
const { updateSyncMeta } = await import('./spreadsheetSyncMeta')

const HEADER = ['شناسه', 'زمان ثبت']

describe('resolveRowAnywhere', () => {
  beforeEach(() => {
    tabs.clear()
    revisions.clear()
    tabs.set('هزینه', [HEADER, ['keep', 't']])
    tabs.set('هزینه 1402', [HEADER, ['x', 't'], ['moved', 't']])
    tabs.set('یادداشت 1402', [HEADER, ['moved', 't']])
    tabs.set('هزینه 1401', [HEADER, ['manual', 't']])
    initStore('sid')
    updateSyncMeta('sid', { archiveTabs: ['هزینه 1402'] })
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

describe('resolveRowAnywhere and unmarked tabs', () => {
  it('never follows a row into a tab the app did not create', async () => {
    await expect(
      resolveRowAnywhere(createRowGuardSession(), 'sid', 'هزینه', 5, ['manual', 't'])
    ).rejects.toBeInstanceOf(RowConflictError)
  })
})

describe('resolveRowAnywhere with an archive created on another device', () => {
  it('refreshes the archive list once before giving up', async () => {
    tabs.set('هزینه 1403', [HEADER, ['fresh', 't']])
    revisions.set('هزینه 1403', { title: 'هزینه 1403', archive: true })
    revisions.set('هزینه 1401', { title: 'هزینه 1401', archive: false })

    expect(
      await resolveRowAnywhere(createRowGuardSession(), 'sid', 'هزینه', 5, ['fresh', 't'])
    ).toEqual({ sheetName: 'هزینه 1403', rowNumber: 2 })

    await expect(
      resolveRowAnywhere(createRowGuardSession(), 'sid', 'هزینه', 5, ['manual', 't'])
    ).rejects.toBeInstanceOf(RowConflictError)
  })
})
