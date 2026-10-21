import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getDefaultSettings, getSettings, saveSettings } from './settings'
import {
  getActiveWorkspaceResolution,
  getActiveWorkspaceType,
  getWorkspaceType,
  hasWorkspaceType,
  isBuildingEntry,
  isWorkspaceTypeKnown,
  personalSpreadsheet,
  rememberPersonalSheet,
  resolveWorkspaceType,
  setWorkspaceType,
  subscribeWorkspace,
  syncWorkspaceTypeFromSheet,
  WORKSPACE_STORAGE_KEY
} from './workspace'

const fetchSheetRows = vi.fn()

vi.mock('./sheets', () => ({ fetchSheetRows: (...args: unknown[]) => fetchSheetRows(...args) }))

const entry = (id: string, kind?: 'personal' | 'building') => ({
  id,
  name: id,
  createdAt: '',
  ...(kind ? { kind } : {})
})

function activate(id: string): void {
  saveSettings({
    ...getDefaultSettings(),
    spreadsheetId: id,
    spreadsheets: [entry('personal-1'), entry('building-1', 'building')]
  })
}

describe('workspace type', () => {
  beforeEach(() => {
    localStorage.clear()
    fetchSheetRows.mockReset()
  })

  it('is personal until a sheet is known as a building', () => {
    expect(getWorkspaceType('building-1')).toBe('personal')
    expect(getWorkspaceType('')).toBe('personal')
    expect(hasWorkspaceType('building-1')).toBe(false)

    setWorkspaceType('building-1', 'building')

    expect(getWorkspaceType('building-1')).toBe('building')
    expect(getWorkspaceType('personal-1')).toBe('personal')
    expect(hasWorkspaceType('building-1')).toBe(true)
  })

  it('is cached per spreadsheet in its account key', () => {
    setWorkspaceType('building-1', 'building')
    setWorkspaceType('personal-1', 'personal')

    expect(JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_KEY) ?? '{}')).toEqual({
      'building-1': 'building',
      'personal-1': 'personal'
    })
  })

  it('follows the active spreadsheet', () => {
    setWorkspaceType('building-1', 'building')
    activate('personal-1')
    expect(getActiveWorkspaceType()).toBe('personal')

    activate('building-1')
    expect(getActiveWorkspaceType()).toBe('building')
  })

  it('tells listeners when a type is set', () => {
    const listener = vi.fn()
    const off = subscribeWorkspace(listener)

    setWorkspaceType('building-1', 'building')
    off()
    setWorkspaceType('building-2', 'building')

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('picks the first spreadsheet that is not a building as the personal one', () => {
    setWorkspaceType('known-building', 'building')

    expect(
      personalSpreadsheet([entry('b', 'building'), entry('known-building'), entry('p')])?.id
    ).toBe('p')
    expect(personalSpreadsheet([entry('b', 'building')])).toBeUndefined()
  })

  it('prefers the personal spreadsheet remembered on this device', () => {
    rememberPersonalSheet('p2')

    expect(personalSpreadsheet([entry('p1'), entry('p2')])?.id).toBe('p2')
  })

  it('ignores a remembered sheet that has become a building or left the list', () => {
    rememberPersonalSheet('p2')
    setWorkspaceType('p2', 'building')
    expect(personalSpreadsheet([entry('p1'), entry('p2')])?.id).toBe('p1')

    rememberPersonalSheet('gone')
    expect(personalSpreadsheet([entry('p1')])?.id).toBe('p1')
  })

  it('never takes a Drive sheet named like a building for the personal one', () => {
    const named = (id: string, name: string) => ({ ...entry(id), name })

    expect(
      personalSpreadsheet([named('b', 'حسابداری · ساختمان نرگس'), named('p', 'حسابداری · اصلی')])
        ?.id
    ).toBe('p')
  })

  it('knows a registered building from its entry or its cached type', () => {
    setWorkspaceType('known', 'building')

    expect(isBuildingEntry(entry('b', 'building'))).toBe(true)
    expect(isBuildingEntry(entry('known'))).toBe(true)
    expect(isBuildingEntry(entry('p'))).toBe(false)
  })
})

describe('the registry kind comes first', () => {
  beforeEach(() => {
    localStorage.clear()
    fetchSheetRows.mockReset()
  })

  it('takes a listed building for a building before its marker row was ever read', () => {
    activate('building-1')

    expect(hasWorkspaceType('building-1')).toBe(false)
    expect(getWorkspaceType('building-1')).toBe('building')
    expect(getActiveWorkspaceType()).toBe('building')
    expect(getWorkspaceType('personal-1')).toBe('personal')
  })

  it('lets what the sheet said win over the registry', () => {
    activate('building-1')
    setWorkspaceType('building-1', 'personal')

    expect(getWorkspaceType('building-1')).toBe('personal')
  })

  it('is unknown only for a sheet with neither a cached type nor a registered kind', () => {
    saveSettings({
      ...getDefaultSettings(),
      spreadsheetId: 'drive-1',
      spreadsheets: [
        entry('personal-1', 'personal'),
        entry('building-1', 'building'),
        entry('drive-1')
      ]
    })

    expect(isWorkspaceTypeKnown('personal-1')).toBe(true)
    expect(isWorkspaceTypeKnown('building-1')).toBe(true)
    expect(isWorkspaceTypeKnown('drive-1')).toBe(false)
    expect(getActiveWorkspaceResolution()).toBe('unknown')

    setWorkspaceType('drive-1', 'personal')
    expect(getActiveWorkspaceResolution()).toBe('personal')
  })

  it('reads the marker row of an unknown sheet before it is switched to, and only then', async () => {
    fetchSheetRows.mockResolvedValue([['نوع فضا', 'ساختمان', 't']])
    saveSettings({
      ...getDefaultSettings(),
      spreadsheetId: 'personal-1',
      spreadsheets: [entry('personal-1', 'personal'), entry('drive-1')]
    })

    expect(await resolveWorkspaceType('drive-1')).toBe('building')
    expect(fetchSheetRows).toHaveBeenCalledTimes(1)
    // The registry now carries the kind too, so a later start needs no read.
    expect(getSettings()?.spreadsheets?.find(sheet => sheet.id === 'drive-1')?.kind).toBe(
      'building'
    )

    expect(await resolveWorkspaceType('drive-1')).toBe('building')
    expect(await resolveWorkspaceType('personal-1')).toBe('personal')
    expect(fetchSheetRows).toHaveBeenCalledTimes(1)
  })
})

describe('reading the type from the sheet', () => {
  beforeEach(() => {
    localStorage.clear()
    fetchSheetRows.mockReset()
  })

  it('reads the «نوع فضا» row of «تنظیمات دوره»', async () => {
    fetchSheetRows.mockResolvedValue([
      ['تاریخ عضویت', '1405/01/01', 't'],
      ['نوع فضا', 'ساختمان', 't']
    ])

    expect(await syncWorkspaceTypeFromSheet('building-1')).toBe('building')
    expect(getWorkspaceType('building-1')).toBe('building')
    expect(fetchSheetRows).toHaveBeenCalledWith('building-1', 'تنظیمات دوره')
  })

  it('treats a sheet without the row as personal', async () => {
    fetchSheetRows.mockResolvedValue([['تاریخ عضویت', '1405/01/01', 't']])

    expect(await syncWorkspaceTypeFromSheet('personal-1')).toBe('personal')
    expect(hasWorkspaceType('personal-1')).toBe(true)
  })

  it('keeps what it knew when the read fails', async () => {
    setWorkspaceType('building-1', 'building')
    fetchSheetRows.mockRejectedValue(new Error('offline'))

    expect(await syncWorkspaceTypeFromSheet('building-1')).toBe('building')
    expect(await syncWorkspaceTypeFromSheet('unknown')).toBe('personal')
    expect(hasWorkspaceType('unknown')).toBe(false)
  })

  it('stores the forms again with the building fields once the type changes', async () => {
    saveSettings({
      ...getDefaultSettings(),
      spreadsheetId: 'building-1',
      spreadsheets: [entry('personal-1'), entry('building-1')]
    })
    expect(getSettings()?.forms.some(form => form.fields.some(f => f.id === 'payer'))).toBe(false)

    fetchSheetRows.mockResolvedValue([['نوع فضا', 'ساختمان', 't']])
    await syncWorkspaceTypeFromSheet('building-1')

    const expense = getSettings()?.forms.find(form => form.type === 'expense')

    expect(expense?.fields.map(field => field.id)).toEqual(
      expect.arrayContaining(['expenseKind', 'split', 'payer'])
    )
  })
})
