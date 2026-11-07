import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as RecordArchive from './recordArchive'
import { sweepArchivesAfterPull } from './recordArchiveSweep'
import type * as SheetGrid from './sheetGrid'
import type * as SheetsApi from './sheetsApi'

const io = vi.hoisted(() => ({ api: 0, grid: 0, plan: 0 }))

vi.mock('./sheetsApi', async importOriginal => ({
  ...(await importOriginal<typeof SheetsApi>()),
  apiRequest: vi.fn(async () => {
    io.api += 1

    return {}
  })
}))
vi.mock('./sheetGrid', async importOriginal => ({
  ...(await importOriginal<typeof SheetGrid>()),
  fetchGridInfo: vi.fn(async () => {
    io.grid += 1

    return {}
  })
}))
vi.mock('./recordArchive', async importOriginal => ({
  ...(await importOriginal<typeof RecordArchive>()),
  planYearSweep: vi.fn(() => {
    io.plan += 1

    return null
  })
}))

import { CHILD_READ_ONLY_MESSAGE } from './childReadOnly'
import { migrateCompactGrids } from './migrateCompactGrids'
import { appendSheetRow, deleteSheetRow, replaceSheetDataRows, updateSheetRow } from './sheetsRows'
import { getSheetDataRows, setSheetAllRows } from './spreadsheetStore'
import { setWorkspaceType } from './workspace'
import type { CustomForm } from '../types'

const FORM = { id: 'f', type: 'expense', sheetName: 'هزینه', fields: [] } as unknown as CustomForm

const HEADER = ['شناسه', 'زمان']

const seed = (id: string) => setSheetAllRows(id, 'هزینه', [HEADER, ['1', 't']])

beforeEach(() => {
  localStorage.clear()
  io.api = 0
  io.grid = 0
  io.plan = 0
})

describe('jobs that run after every pull', () => {
  it('do nothing on a child account, so they never repeat on its private tabs', async () => {
    setWorkspaceType('CH', 'child')
    seed('CH')

    await migrateCompactGrids('CH')
    await sweepArchivesAfterPull('CH', [FORM])

    expect(io.api).toBe(0)
    expect(io.grid).toBe(0)
    expect(io.plan).toBe(0)
  })

  it('still look at a personal sheet', async () => {
    seed('P1')

    await sweepArchivesAfterPull('P1', [FORM])
    await migrateCompactGrids('P1').catch(() => undefined)

    expect(io.plan).toBeGreaterThan(0)
    expect(io.api + io.grid).toBeGreaterThan(0)
  })
})

describe('a refused write to a child account leaves no phantom row', () => {
  it.each([
    ['append', (id: string) => appendSheetRow(id, 'هزینه', ['2', 't'])],
    ['update', (id: string) => updateSheetRow(id, 'هزینه', 2, ['1', 'changed'])],
    ['delete', (id: string) => deleteSheetRow(id, 'هزینه', 2)],
    ['replace', (id: string) => replaceSheetDataRows(id, 'هزینه', [['9', 'z']])]
  ])('%s', async (_name, write) => {
    setWorkspaceType('CH', 'child')
    seed('CH')

    await expect(write('CH')).rejects.toThrow(CHILD_READ_ONLY_MESSAGE)
    expect(getSheetDataRows('CH', 'هزینه')).toEqual([['1', 't']])
  })
})
