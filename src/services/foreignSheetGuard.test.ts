import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as DriveModule from './drive'

const io = vi.hoisted(() => ({
  access: vi.fn(),
  rows: vi.fn()
}))

vi.mock('./drive', async importOriginal => ({
  ...(await importOriginal<typeof DriveModule>()),
  getDriveFileAccess: (id: string) => io.access(id)
}))
vi.mock('./sheetsRows', () => ({
  batchFetchSheetRangesFromApi: (id: string) => io.rows(id)
}))

import {
  assertCanOpenAsOwnSheet,
  canOpenAsOwnSheet,
  FOREIGN_READ_ONLY_SHEET_MESSAGE,
  resetForeignSheetGuard
} from './foreignSheetGuard'
import { getDefaultSettings, saveSettings } from './settings'
import { WORKSPACE_TYPE_ROW } from './workspace'

const OWNED = { ownedByMe: true }

const EDITABLE_FOREIGN = { ownedByMe: false, capabilities: { canEdit: true } }

const READ_ONLY_FOREIGN = { ownedByMe: false, capabilities: { canEdit: false } }

const entry = (id: string, kind?: 'building' | 'shared' | 'child') => ({
  id,
  name: `حسابداری ${id}`,
  createdAt: '',
  ...(kind ? { kind } : {})
})

/** The «تنظیمات دوره» rows of a sheet: header, then the marker row (none = personal). */
const marker = (value?: string) =>
  new Map([['تنظیمات دوره', [['کلید', 'مقدار'], ...(value ? [[WORKSPACE_TYPE_ROW, value]] : [])]]])

beforeEach(() => {
  localStorage.clear()
  io.access.mockReset()
  io.rows.mockReset()
  resetForeignSheetGuard()
  saveSettings({ ...getDefaultSettings(), spreadsheetId: 'own', spreadsheets: [entry('own')] })
})

describe('canOpenAsOwnSheet', () => {
  it('refuses only a foreign read-only file that reads as a personal account', () => {
    expect(canOpenAsOwnSheet(READ_ONLY_FOREIGN, 'personal')).toBe(false)
  })

  it('lets a read-only viewer of a shared account, a building or a registered child in', () => {
    expect(canOpenAsOwnSheet(READ_ONLY_FOREIGN, 'shared')).toBe(true)
    expect(canOpenAsOwnSheet(READ_ONLY_FOREIGN, 'building')).toBe(true)
    expect(canOpenAsOwnSheet(READ_ONLY_FOREIGN, 'child')).toBe(true)
  })

  it('does not touch owned files, files shared for editing, or files Drive did not describe', () => {
    expect(canOpenAsOwnSheet(OWNED, 'personal')).toBe(true)
    expect(canOpenAsOwnSheet(EDITABLE_FOREIGN, 'personal')).toBe(true)
    expect(canOpenAsOwnSheet({}, 'personal')).toBe(true)
    expect(canOpenAsOwnSheet({ ownedByMe: false }, 'personal')).toBe(true)
  })
})

describe('assertCanOpenAsOwnSheet', () => {
  it('refuses a child sheet picked through the generic picker, before any other read', async () => {
    io.access.mockResolvedValue(READ_ONLY_FOREIGN)
    io.rows.mockResolvedValue(marker())

    await expect(assertCanOpenAsOwnSheet('kid')).rejects.toThrow(FOREIGN_READ_ONLY_SHEET_MESSAGE)
    expect(FOREIGN_READ_ONLY_SHEET_MESSAGE).toContain('فرزندان من')
  })

  it('opens a shared account the user can only view', async () => {
    io.access.mockResolvedValue(READ_ONLY_FOREIGN)
    io.rows.mockResolvedValue(marker('حساب مشترک'))

    await expect(assertCanOpenAsOwnSheet('shared-1')).resolves.toBeUndefined()
  })

  it('opens a building the user can only view', async () => {
    io.access.mockResolvedValue(READ_ONLY_FOREIGN)
    io.rows.mockResolvedValue(marker('ساختمان'))

    await expect(assertCanOpenAsOwnSheet('building-1')).resolves.toBeUndefined()
  })

  it('refuses a read-only file whose marker cannot be read (fail closed)', async () => {
    io.access.mockResolvedValue(READ_ONLY_FOREIGN)
    io.rows.mockRejectedValue(new Error('offline'))

    await expect(assertCanOpenAsOwnSheet('kid')).rejects.toThrow('offline')
  })

  it('opens an owned sheet and remembers it: one Drive request per page life', async () => {
    io.access.mockResolvedValue(OWNED)

    await assertCanOpenAsOwnSheet('own', entry('own'))
    await assertCanOpenAsOwnSheet('own', entry('own'))

    expect(io.access).toHaveBeenCalledTimes(1)
    expect(io.rows).not.toHaveBeenCalled()
  })

  it('opens a sheet shared for editing (a second Google account of the same person)', async () => {
    io.access.mockResolvedValue(EDITABLE_FOREIGN)

    await expect(assertCanOpenAsOwnSheet('mine-too')).resolves.toBeUndefined()
    expect(io.rows).not.toHaveBeenCalled()
  })

  it('skips Drive for a sheet registered as a child, a building or a shared account', async () => {
    saveSettings({
      ...getDefaultSettings(),
      spreadsheetId: 'own',
      spreadsheets: [entry('kid', 'child'), entry('b', 'building'), entry('s', 'shared')]
    })

    for (const id of ['kid', 'b', 's']) {
      await expect(assertCanOpenAsOwnSheet(id)).resolves.toBeUndefined()
    }
    expect(io.access).not.toHaveBeenCalled()
  })

  it('lets a sheet already on the list open when Drive cannot be asked, but not a new one', async () => {
    io.access.mockRejectedValue(new Error('offline'))

    await expect(assertCanOpenAsOwnSheet('own', entry('own'))).resolves.toBeUndefined()
    await expect(assertCanOpenAsOwnSheet('picked')).rejects.toThrow('offline')
  })
})
