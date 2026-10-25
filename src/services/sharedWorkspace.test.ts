import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getDefaultSettings, saveSettings } from './settings'
import { sharedLabel, WORKSPACE_SHARED_VALUE } from './sharedWorkspace'
import {
  assertMemberWorkspace,
  getWorkspaceType,
  hasSharedAccount,
  isSharedEntry,
  personalSpreadsheet,
  setWorkspaceType,
  sharedSpreadsheetId,
  syncWorkspaceTypeFromSheet,
  WORKSPACE_TYPE_ROW
} from './workspace'
import { workspaceRedirect } from '../routes/workspaceRedirect'

const fetchSheetRows = vi.fn()

vi.mock('./sheets', () => ({ fetchSheetRows: (...args: unknown[]) => fetchSheetRows(...args) }))

describe('shared workspace type', () => {
  beforeEach(() => {
    localStorage.clear()
    fetchSheetRows.mockReset()
  })

  it('labels a shared account with its name', () => {
    expect(WORKSPACE_SHARED_VALUE).toBe('حساب مشترک')
    expect(sharedLabel('  خانواده ')).toBe('مشترک خانواده')
  })

  it('is cached as shared once set', () => {
    expect(getWorkspaceType('s1')).toBe('personal')

    setWorkspaceType('s1', 'shared')

    expect(getWorkspaceType('s1')).toBe('shared')
    expect(getWorkspaceType('p1')).toBe('personal')
  })

  it('reads the shared marker from the sheet and still reads a building', async () => {
    fetchSheetRows.mockResolvedValue([[WORKSPACE_TYPE_ROW, WORKSPACE_SHARED_VALUE]])
    expect(await syncWorkspaceTypeFromSheet('s1')).toBe('shared')
    expect(getWorkspaceType('s1')).toBe('shared')

    fetchSheetRows.mockResolvedValue([[WORKSPACE_TYPE_ROW, 'ساختمان']])
    expect(await syncWorkspaceTypeFromSheet('b1')).toBe('building')
    expect(getWorkspaceType('b1')).toBe('building')
  })

  it('a failed marker read leaves a cached shared type unchanged', async () => {
    setWorkspaceType('s1', 'shared')
    fetchSheetRows.mockRejectedValue(new Error('offline'))

    expect(await syncWorkspaceTypeFromSheet('s1')).toBe('shared')
    expect(getWorkspaceType('s1')).toBe('shared')
  })

  it('keeps the registry kind in step with the marker of a shared sheet', async () => {
    saveSettings({
      ...getDefaultSettings(),
      spreadsheetId: 'p',
      spreadsheets: [
        { id: 'p', name: 'p', createdAt: '' },
        { id: 's1', name: 's1', createdAt: '' }
      ]
    })
    fetchSheetRows.mockResolvedValue([[WORKSPACE_TYPE_ROW, WORKSPACE_SHARED_VALUE]])

    await syncWorkspaceTypeFromSheet('s1')

    expect(hasSharedAccount()).toBe(true)
    expect(sharedSpreadsheetId()).toBe('s1')
  })

  it('never takes a shared sheet for the personal one', () => {
    const entries = [
      { id: 's', name: 'حسابداری · مشترک X', kind: 'shared' as const },
      { id: 'p', name: 'حسابداری · ۱۴۰۵' }
    ]

    expect(personalSpreadsheet(entries)?.id).toBe('p')
    // A Drive-listed shared sheet this device never registered is skipped by its name.
    expect(personalSpreadsheet([{ id: 'd', name: 'حسابداری · مشترک Y' }, entries[1]])?.id).toBe('p')
    // And one whose marker was read.
    setWorkspaceType('m', 'shared')
    expect(personalSpreadsheet([{ id: 'm', name: 'x' }, entries[1]])?.id).toBe('p')
  })

  it('has no shared account until one is registered', () => {
    expect(hasSharedAccount()).toBe(false)
    expect(sharedSpreadsheetId()).toBeNull()

    saveSettings({
      ...getDefaultSettings(),
      spreadsheetId: 'p',
      spreadsheets: [
        { id: 'p', name: 'p', createdAt: '' },
        { id: 's', name: 's', createdAt: '', kind: 'shared' }
      ]
    })

    expect(hasSharedAccount()).toBe(true)
    expect(sharedSpreadsheetId()).toBe('s')
  })

  it('recognises a shared entry by its kind or its cached type', () => {
    expect(isSharedEntry({ id: 'a', kind: 'shared' })).toBe(true)
    expect(isSharedEntry({ id: 'a' })).toBe(false)

    setWorkspaceType('a', 'shared')

    expect(isSharedEntry({ id: 'a' })).toBe(true)
  })

  it('lets only a building or a shared sheet pass the member guard', () => {
    setWorkspaceType('b', 'building')
    setWorkspaceType('s', 'shared')

    expect(() => assertMemberWorkspace('p')).toThrow()
    expect(() => assertMemberWorkspace('b')).not.toThrow()
    expect(() => assertMemberWorkspace('s')).not.toThrow()
  })

  it('redirects by the workspace type', () => {
    expect(workspaceRedirect('/building', 'personal')).toBe('/')
    expect(workspaceRedirect('/building', 'building')).toBeNull()
    expect(workspaceRedirect('/installments', 'building')).toBe('/building')
    // A shared account sends the personal-only pages to its own home.
    expect(workspaceRedirect('/installments', 'shared')).toBe('/shared')
  })
})
