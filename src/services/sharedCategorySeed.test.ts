import { beforeEach, describe, expect, it, vi } from 'vitest'

const io = vi.hoisted(() => ({ writes: [] as string[], fail: false, canBudget: false }))

vi.mock('./sheets', () => ({
  ensureSheetWithHeaders: vi.fn(async (_id: string, sheet: string) => {
    io.writes.push(`ensure:${sheet}`)
  }),
  fetchSheetRows: vi.fn(async () => []),
  replaceSheetDataRows: vi.fn(async (_id: string, sheet: string) => {
    if (io.fail) throw new Error('403')
    io.writes.push(`replace:${sheet}`)
  })
}))

// The signed-in user's role in the shared account: «بودجه و دسته‌ها» or not.
vi.mock('./buildingRoles', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  can: () => io.canBudget
}))

import {
  saveCategoryGroupOnSheet,
  saveDangCategoriesToSheet,
  savePersonalReminderCategoriesToSheet,
  saveReceivableCategoriesToSheet,
  syncCategoriesFromSheet
} from './categories'
import { CATEGORIES_SHEET } from './sheetNames'
import { setWorkspaceType } from './workspace'

beforeEach(() => {
  localStorage.clear()
  io.writes = []
  io.fail = false
  io.canBudget = false
})

describe('opening a shared account never needs a category write', () => {
  it('a reader (no «بودجه و دسته‌ها») opens it without writing a seed', async () => {
    setWorkspaceType('SV1', 'shared')

    await expect(syncCategoriesFromSheet('SV1')).resolves.toBeTruthy()
    expect(io.writes).toEqual([])
  })

  it('a refused seed does not abort the open', async () => {
    setWorkspaceType('SV2', 'shared')
    io.canBudget = true
    io.fail = true

    await expect(syncCategoriesFromSheet('SV2')).resolves.toBeTruthy()
  })

  it('a writer still seeds an empty list', async () => {
    setWorkspaceType('SV3', 'shared')
    io.canBudget = true

    await syncCategoriesFromSheet('SV3')

    expect(io.writes).toContain(`replace:${CATEGORIES_SHEET}`)
  })
})

describe('every category list writer refuses a shared reader', () => {
  it('group, dang, receivable and personal reminder lists', async () => {
    setWorkspaceType('SV4', 'shared')

    for (const write of [
      () => saveCategoryGroupOnSheet('SV4', { expense: ['خوراک'] }),
      () => saveDangCategoriesToSheet('SV4', ['شام']),
      () => saveReceivableCategoriesToSheet('SV4', ['قرض']),
      () => savePersonalReminderCategoriesToSheet('SV4', ['قبض'])
    ]) {
      await expect(write()).rejects.toThrow('دسترسی ندارید')
    }
    expect(io.writes).toEqual([])
  })
})

describe('personal and building seeding is unchanged', () => {
  it.each([
    ['personal', 'PC1'],
    ['building', 'BC1']
  ] as const)('%s: seeds, and a failed seed still fails the open', async (type, id) => {
    if (type === 'building') setWorkspaceType(id, 'building')

    await syncCategoriesFromSheet(id)
    expect(io.writes).toEqual([
      `ensure:${CATEGORIES_SHEET}`,
      `ensure:${CATEGORIES_SHEET}`,
      `replace:${CATEGORIES_SHEET}`
    ])

    io.fail = true
    await expect(syncCategoriesFromSheet(id)).rejects.toThrow('403')
  })
})
