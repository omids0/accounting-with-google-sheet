import { beforeEach, describe, expect, it, vi } from 'vitest'

const io = vi.hoisted(() => ({ marker: [] as string[][], calls: 0 }))

vi.mock('./sheets', () => ({
  fetchSheetRows: vi.fn(async () => {
    io.calls += 1

    return io.marker
  })
}))

import {
  assertNotChildReadOnly,
  assertSheetsWriteAllowed,
  CHILD_READ_ONLY_MESSAGE,
  CHILD_READ_ONLY_STATUS,
  isChildReadOnly
} from './childReadOnly'
import { sharedCan } from './sharedCan'
import { CHILD_VIEW_SHEETS, PERSONAL_ONLY_SHEETS } from './sheetNames'
import { isPermanentApiError, isSpreadsheetAccessDeniedError, SheetsApiError } from './sheetsApi'
import { staticSheetsFor } from './sheetSyncSheetNames'
import { setItem, STORAGE_KEYS } from './storage'
import {
  getWorkspaceType,
  hasPersonalTabs,
  isChildEntry,
  isChildWorkspace,
  isPersonalWorkspace,
  personalSpreadsheet,
  resolveWorkspaceType,
  setWorkspaceType,
  syncWorkspaceTypeFromSheet
} from './workspace'

const registerChild = (id: string) =>
  setItem(STORAGE_KEYS.SETTINGS, {
    spreadsheetId: 'P1',
    spreadsheets: [
      { id: 'P1', name: 'من', createdAt: '' },
      { id, name: 'فرزند', createdAt: '', kind: 'child' }
    ],
    forms: []
  })

beforeEach(() => {
  localStorage.clear()
  io.marker = []
  io.calls = 0
})

describe('the child workspace kind', () => {
  it('is not personal, so every personal-only writer stays off', () => {
    setWorkspaceType('CH', 'child')

    expect(isChildWorkspace('CH')).toBe(true)
    expect(isPersonalWorkspace('CH')).toBe(false)
    expect(hasPersonalTabs('CH')).toBe(false)
    expect(getWorkspaceType('CH')).toBe('child')
    expect(isChildEntry({ id: 'CH' })).toBe(true)
    expect(isChildEntry({ id: 'X', kind: 'child' })).toBe(true)
    expect(isChildWorkspace('P1')).toBe(false)
  })

  it('is known from the registry kind alone, before any marker row is read', () => {
    registerChild('CH')

    expect(getWorkspaceType('CH')).toBe('child')
    expect(isPersonalWorkspace('CH')).toBe(false)
  })

  it("is never taken for the parent's own personal sheet", () => {
    registerChild('CH')

    expect(personalSpreadsheet([{ id: 'CH', name: 'فرزند', kind: 'child' }])).toBeUndefined()
  })

  it('is never downgraded by the sheet saying «personal»', async () => {
    registerChild('CH')
    io.marker = []

    expect(await syncWorkspaceTypeFromSheet('CH')).toBe('child')
    expect(await resolveWorkspaceType('CH')).toBe('child')
    expect(io.calls).toBe(0)
    expect(getWorkspaceType('CH')).toBe('child')
  })

  it('is never overwritten even when only the device cache holds the child entry', async () => {
    setWorkspaceType('CH', 'child')

    expect(await syncWorkspaceTypeFromSheet('CH')).toBe('child')
    expect(isChildWorkspace('CH')).toBe(true)
  })

  it('still lets a personal sheet learn its type from the sheet', async () => {
    expect(await syncWorkspaceTypeFromSheet('P9')).toBe('personal')
    expect(io.calls).toBe(1)
  })
})

describe('read-only guard', () => {
  it('throws the Persian message for a child and passes other sheets', () => {
    setWorkspaceType('CH', 'child')

    expect(() => assertNotChildReadOnly('CH')).toThrow(CHILD_READ_ONLY_MESSAGE)
    expect(() => assertNotChildReadOnly('P1')).not.toThrow()
    expect(isChildReadOnly('CH')).toBe(true)
    expect(isChildReadOnly('P1')).toBe(false)
  })

  it('refuses a non-read Sheets request to a child only', () => {
    setWorkspaceType('CH', 'child')

    const base = 'https://sheets.googleapis.com/v4/spreadsheets'

    expect(() => assertSheetsWriteAllowed(`${base}/CH/values/A1:append`, 'POST')).toThrow(
      CHILD_READ_ONLY_MESSAGE
    )
    expect(() => assertSheetsWriteAllowed(`${base}/CH:batchUpdate`, 'post')).toThrow()
    expect(() => assertSheetsWriteAllowed(`${base}/CH/values/A1`, 'PUT')).toThrow()
    expect(() => assertSheetsWriteAllowed(`${base}/CH/values:batchGet`)).not.toThrow()
    expect(() => assertSheetsWriteAllowed(`${base}/CH`, 'GET')).not.toThrow()
    expect(() => assertSheetsWriteAllowed(`${base}/P1:batchUpdate`, 'POST')).not.toThrow()
    expect(() => assertSheetsWriteAllowed(base, 'POST')).not.toThrow()
    // Drive: the parent removing their own permission must work.
    expect(() =>
      assertSheetsWriteAllowed(
        'https://www.googleapis.com/drive/v3/files/CH/permissions/1',
        'DELETE'
      )
    ).not.toThrow()
  })

  it('allows nothing through the shared permission table', () => {
    setWorkspaceType('CH', 'child')

    expect(sharedCan('record', 'CH')).toBe(false)
    expect(sharedCan('record', 'P1')).toBe(true)
  })
})

describe('tab set of a child', () => {
  it('is the record-tab list and nothing personal-only', () => {
    expect(staticSheetsFor('child')).toBe(CHILD_VIEW_SHEETS)
    expect(CHILD_VIEW_SHEETS.filter(tab => PERSONAL_ONLY_SHEETS.includes(tab))).toEqual([])
  })
})

describe('the read-only error', () => {
  it('is a sheet error, permanent, so no retry loop repeats it', () => {
    setWorkspaceType('CH', 'child')

    let caught: unknown

    try {
      assertNotChildReadOnly('CH')
    } catch (err) {
      caught = err
    }

    expect(caught).toBeInstanceOf(SheetsApiError)
    expect((caught as SheetsApiError).status).toBe(CHILD_READ_ONLY_STATUS)
    expect(isPermanentApiError(caught)).toBe(true)
    expect(isSpreadsheetAccessDeniedError(caught)).toBe(false)
  })
})

describe('the tabs a child account reports', () => {
  it('are the record forms and the view tabs only, never a module tab', async () => {
    const { getAllSheetSpecs } = await import('./allSheetSpecs')

    setItem(STORAGE_KEYS.SETTINGS, {
      spreadsheetId: 'CH',
      spreadsheets: [{ id: 'CH', name: 'فرزند', createdAt: '', kind: 'child' }],
      forms: [
        { id: 'a', type: 'income', sheetName: 'درآمد', fields: [] },
        { id: 'b', type: 'expense', sheetName: 'هزینه', fields: [] },
        { id: 'c', type: 'custom', sheetName: 'سفارشی', fields: [] }
      ]
    })

    const names = getAllSheetSpecs('CH').map(spec => spec.sheetName)

    expect(names).toEqual(expect.arrayContaining(['درآمد', 'هزینه', ...CHILD_VIEW_SHEETS]))
    expect(names).not.toContain('سفارشی')
    expect(names.filter(name => PERSONAL_ONLY_SHEETS.includes(name))).toEqual([])
    expect(names).toHaveLength(2 + CHILD_VIEW_SHEETS.length)
  })
})
