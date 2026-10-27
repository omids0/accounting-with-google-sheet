import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getDefaultSettings, getSettings, getSpreadsheets, saveSettings } from './settings'
import { anotherSharedExists, undoPickedSheet } from './sharedConnect'
import { hasWorkspaceType, setWorkspaceType, sharedSpreadsheetId } from './workspace'
import type { SpreadsheetEntry } from '../types'

const { calls } = vi.hoisted(() => ({ calls: [] as string[] }))

vi.mock('./spreadsheetSetup', () => ({
  switchActiveSpreadsheet: async (id: string) => {
    calls.push(`switch:${id}`)
    saveSettings({ ...getSettings()!, spreadsheetId: id })
  }
}))
vi.mock('./spreadsheetSwitch', () => ({
  moveSyncToSpreadsheet: async (from: string, to: string) => {
    calls.push(`move:${from}>${to}`)
  }
}))

const entry = (id: string, kind?: SpreadsheetEntry['kind']): SpreadsheetEntry => ({
  id,
  name: id,
  createdAt: '',
  ...(kind ? { kind } : {})
})

describe('anotherSharedExists', () => {
  it('is false when the picked sheet is the only shared one, wherever it sits in the registry', () => {
    const picked = entry('new', 'shared')

    expect(anotherSharedExists([entry('p'), picked], 'new')).toBe(false)
    expect(anotherSharedExists([picked, entry('p')], 'new')).toBe(false)
  })

  it('is true for a different shared entry, even when the picked one comes first or is hidden', () => {
    expect(anotherSharedExists([entry('new', 'shared'), entry('old', 'shared')], 'new')).toBe(true)
    expect(anotherSharedExists([entry('old', 'shared'), entry('new', 'shared')], 'new')).toBe(true)
  })

  it('is false with no other shared sheet (building, personal)', () => {
    expect(anotherSharedExists([entry('p'), entry('b', 'building')], 'new')).toBe(false)
  })
})

describe('undoPickedSheet', () => {
  beforeEach(() => {
    localStorage.clear()
    calls.length = 0
    saveSettings({
      ...getDefaultSettings(),
      spreadsheetId: 'new',
      spreadsheets: [entry('p'), entry('old', 'shared'), entry('new', 'shared')]
    })
    setWorkspaceType('old', 'shared')
    setWorkspaceType('new', 'shared')
  })

  it('goes back to the previous sheet first, then forgets the refused shared sheet', async () => {
    await undoPickedSheet('new', 'p', true)

    expect(calls).toEqual(['switch:p', 'move:new>p'])
    expect(getSettings()?.spreadsheetId).toBe('p')
    expect(getSpreadsheets().map(item => item.id)).toEqual(['p', 'old'])
    expect(hasWorkspaceType('new')).toBe(false)
    expect(sharedSpreadsheetId()).toBe('old')
  })

  it('keeps the entry when it is not a refused second account', async () => {
    await undoPickedSheet('new', 'p', false)

    expect(getSpreadsheets().map(item => item.id)).toEqual(['p', 'old', 'new'])
  })
})
