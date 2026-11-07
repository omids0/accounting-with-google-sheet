import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  changePalette,
  isPaletteSheet,
  PALETTE_DARK_ROW,
  PALETTE_LIGHT_ROW,
  palettesOfRows,
  syncPalettesFromSheet
} from './appPalette'
import { getDefaultSettings, getSettings, saveSettings } from './settings'
import { setWorkspaceType } from './workspace'
import { getPalette } from '../utils/theme'

const fetchSheetRows = vi.fn()

const setPeriodSetting = vi.fn()

vi.mock('./sheets', () => ({ fetchSheetRows: (...args: unknown[]) => fetchSheetRows(...args) }))
vi.mock('./periodSettings', () => ({
  setPeriodSetting: (...args: unknown[]) => setPeriodSetting(...args)
}))

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

const rows = (light?: string, dark?: string) =>
  [
    ['نوع فضا', 'ساختمان', 't'],
    ...(light ? [[PALETTE_LIGHT_ROW, light, 't']] : []),
    ...(dark ? [[PALETTE_DARK_ROW, dark, 't']] : [])
  ] as string[][]

describe('palettesOfRows', () => {
  it('reads both rows and defaults a missing, empty or unknown value', () => {
    expect(palettesOfRows(rows('ocean', 'orchid'))).toEqual({ light: 'ocean', dark: 'orchid' })
    expect(palettesOfRows(rows('ocean'))).toEqual({ light: 'ocean', dark: 'emerald' })
    expect(palettesOfRows(rows('neon-pink', ''))).toEqual({ light: 'emerald', dark: 'emerald' })
    expect(palettesOfRows([])).toEqual({ light: 'emerald', dark: 'emerald' })
  })
})

describe('isPaletteSheet', () => {
  beforeEach(() => localStorage.clear())

  it('is true for the personal sheet only', () => {
    activate('personal-1')
    setWorkspaceType('building-1', 'building')

    expect(isPaletteSheet('personal-1')).toBe(true)
    expect(isPaletteSheet('building-1')).toBe(false)
    expect(isPaletteSheet('')).toBe(false)
  })

  it('is false for a shared account and a second personal sheet', () => {
    saveSettings({
      ...getDefaultSettings(),
      spreadsheetId: 'personal-1',
      spreadsheets: [entry('personal-1'), entry('personal-2'), entry('shared-1')]
    })
    setWorkspaceType('shared-1', 'shared')

    expect(isPaletteSheet('shared-1')).toBe(false)
    expect(isPaletteSheet('personal-2')).toBe(false)
    expect(isPaletteSheet('personal-1')).toBe(true)
  })
})

describe('changePalette', () => {
  beforeEach(() => {
    localStorage.clear()
    setPeriodSetting.mockReset().mockResolvedValue(undefined)
    document.documentElement.removeAttribute('data-palette-light')
    document.documentElement.removeAttribute('data-palette-dark')
    document.documentElement.setAttribute('data-theme', 'light')
  })

  it('saves the pick, applies it to the page and writes only that mode to the personal sheet', async () => {
    activate('personal-1')

    await changePalette('light', 'ocean')

    expect(getPalette('light')).toBe('ocean')
    expect(getPalette('dark')).toBe('emerald')
    expect(document.documentElement.getAttribute('data-palette-light')).toBe('ocean')
    expect(setPeriodSetting).toHaveBeenCalledTimes(1)
    expect(setPeriodSetting).toHaveBeenCalledWith('personal-1', PALETTE_LIGHT_ROW, 'ocean')
    expect(getSettings()?.palettePending).toBeFalsy()
  })

  it('puts only the palette of the mode on screen on the page', async () => {
    activate('personal-1')
    await changePalette('dark', 'brown')

    // Dark choice is stored but the page is in light mode: no attribute at all.
    expect(getPalette('dark')).toBe('brown')
    expect(document.documentElement.hasAttribute('data-palette-dark')).toBe(false)
    expect(document.documentElement.hasAttribute('data-palette-light')).toBe(false)
  })

  it('does nothing for the palette already chosen', async () => {
    activate('personal-1')
    await changePalette('light', 'emerald')

    expect(setPeriodSetting).not.toHaveBeenCalled()
  })

  it('keeps the pick locally and marks it pending while a building is open', async () => {
    activate('building-1')
    setWorkspaceType('building-1', 'building')

    await changePalette('light', 'violet')

    expect(getPalette('light')).toBe('violet')
    expect(setPeriodSetting).not.toHaveBeenCalled()
    expect(getSettings()?.palettePending).toBe(true)
  })

  it('never throws when the sheet write fails: the pick stays and goes out later', async () => {
    activate('personal-1')
    setPeriodSetting.mockRejectedValue(new Error('offline'))

    await expect(changePalette('light', 'rose')).resolves.toBeUndefined()

    expect(getPalette('light')).toBe('rose')
    expect(getSettings()?.palettePending).toBe(true)
  })
})

describe('syncPalettesFromSheet', () => {
  beforeEach(() => {
    localStorage.clear()
    fetchSheetRows.mockReset()
    setPeriodSetting.mockReset().mockResolvedValue(undefined)
  })

  it('adopts the sheet palettes (the sheet wins)', async () => {
    activate('personal-1')
    fetchSheetRows.mockResolvedValue(rows('indigo', 'caspian'))

    await syncPalettesFromSheet('personal-1')

    expect(getPalette('light')).toBe('indigo')
    expect(getPalette('dark')).toBe('caspian')
  })

  it('resets to the default when the sheet has no palette rows', async () => {
    activate('personal-1')
    saveSettings({ ...getSettings()!, paletteLight: 'ocean' })
    fetchSheetRows.mockResolvedValue(rows())

    await syncPalettesFromSheet('personal-1')

    expect(getPalette('light')).toBe('emerald')
  })

  it('keeps what is shown when the read fails', async () => {
    activate('personal-1')
    saveSettings({ ...getSettings()!, paletteLight: 'ocean' })
    fetchSheetRows.mockRejectedValue(new Error('offline'))

    await syncPalettesFromSheet('personal-1')

    expect(getPalette('light')).toBe('ocean')
  })

  it('never reads or applies the rows of a building sheet', async () => {
    activate('building-1')
    setWorkspaceType('building-1', 'building')
    fetchSheetRows.mockResolvedValue(rows('ocean', 'ocean'))

    await syncPalettesFromSheet('building-1')

    expect(fetchSheetRows).not.toHaveBeenCalled()
    expect(getPalette('light')).toBe('emerald')
  })

  it('sends a pending pick to the personal sheet instead of replacing it', async () => {
    activate('personal-1')
    saveSettings({ ...getSettings()!, paletteLight: 'violet', palettePending: true })
    fetchSheetRows.mockResolvedValue(rows('ocean', 'ocean'))

    await syncPalettesFromSheet('personal-1')

    expect(getPalette('light')).toBe('violet')
    expect(setPeriodSetting).toHaveBeenCalledWith('personal-1', PALETTE_LIGHT_ROW, 'violet')
    expect(setPeriodSetting).toHaveBeenCalledWith('personal-1', PALETTE_DARK_ROW, 'emerald')
    expect(getSettings()?.palettePending).toBeFalsy()
  })
})
