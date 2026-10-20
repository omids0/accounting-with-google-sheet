import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getDefaultSettings, getSettings, saveSettings } from './settings'
import {
  getActiveWorkspaceType,
  getWorkspaceType,
  hasWorkspaceType,
  personalSpreadsheet,
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
    activate('building-1')
    expect(getSettings()?.forms.some(form => form.fields.some(f => f.id === 'payer'))).toBe(false)

    fetchSheetRows.mockResolvedValue([['نوع فضا', 'ساختمان', 't']])
    await syncWorkspaceTypeFromSheet('building-1')

    const expense = getSettings()?.forms.find(form => form.type === 'expense')

    expect(expense?.fields.map(field => field.id)).toEqual(
      expect.arrayContaining(['expenseKind', 'split', 'payer'])
    )
  })
})
