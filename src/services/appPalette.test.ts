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
import { PERIOD_SETTINGS_SHEET } from './sheetNames'
import { initStore, setSheetAllRows } from './spreadsheetStore'
import { setWorkspaceType } from './workspace'
import { getPalette } from '../utils/theme'

const setPeriodSetting = vi.fn()

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
  it('reads both rows: an unknown id is the default, a missing or blank row is no opinion', () => {
    expect(palettesOfRows(rows('ocean', 'orchid'))).toEqual({ light: 'ocean', dark: 'orchid' })
    expect(palettesOfRows(rows('ocean'))).toEqual({ light: 'ocean', dark: null })
    expect(palettesOfRows(rows('neon-pink', ''))).toEqual({ light: 'emerald', dark: null })
    expect(palettesOfRows([])).toEqual({ light: null, dark: null })
  })
})

describe('isPaletteSheet', () => {
  beforeEach(() => localStorage.clear())

  it('is true for a personal sheet only', () => {
    activate('personal-1')
    setWorkspaceType('building-1', 'building')

    expect(isPaletteSheet('personal-1')).toBe(true)
    expect(isPaletteSheet('building-1')).toBe(false)
    expect(isPaletteSheet('')).toBe(false)
  })

  it('is true for every personal sheet (a year sheet too) and false for a shared account', () => {
    saveSettings({
      ...getDefaultSettings(),
      spreadsheetId: 'personal-1',
      spreadsheets: [entry('personal-1'), entry('personal-2'), entry('shared-1')]
    })
    setWorkspaceType('shared-1', 'shared')

    expect(isPaletteSheet('shared-1')).toBe(false)
    expect(isPaletteSheet('personal-2')).toBe(true)
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

/** The pull has filled the local mirror of the tab; the sync reads it. */
function mirror(id: string, tabRows: string[][]): void {
  initStore(id)
  setSheetAllRows(id, PERIOD_SETTINGS_SHEET, tabRows)
}

describe('syncPalettesFromSheet', () => {
  beforeEach(() => {
    localStorage.clear()
    setPeriodSetting.mockReset().mockResolvedValue(undefined)
  })

  it('adopts the sheet palettes (the sheet wins)', async () => {
    activate('personal-1')
    mirror('personal-1', rows('indigo', 'caspian'))

    await syncPalettesFromSheet('personal-1')

    expect(getPalette('light')).toBe('indigo')
    expect(getPalette('dark')).toBe('caspian')
    expect(setPeriodSetting).not.toHaveBeenCalled()
  })

  it('applies the phone app pick on a web app that still shows the default', async () => {
    activate('personal-1')
    mirror('personal-1', rows('ocean'))

    await syncPalettesFromSheet('personal-1')

    expect(getPalette('light')).toBe('ocean')
  })

  it('works on a second personal sheet, not only the first', async () => {
    saveSettings({
      ...getDefaultSettings(),
      spreadsheetId: 'personal-2',
      spreadsheets: [entry('personal-1'), entry('personal-2')]
    })
    mirror('personal-2', rows('violet', 'rose'))

    await syncPalettesFromSheet('personal-2')

    expect(getPalette('light')).toBe('violet')
    expect(getPalette('dark')).toBe('rose')
  })

  it('keeps the device pick for a mode the sheet has no row for and writes it there', async () => {
    activate('personal-1')
    saveSettings({ ...getSettings()!, paletteLight: 'ocean', paletteDark: 'navygold' })
    mirror('personal-1', rows('ocean'))

    await syncPalettesFromSheet('personal-1')

    expect(getPalette('light')).toBe('ocean')
    expect(getPalette('dark')).toBe('navygold')
    expect(setPeriodSetting).toHaveBeenCalledTimes(1)
    expect(setPeriodSetting).toHaveBeenCalledWith('personal-1', PALETTE_DARK_ROW, 'navygold')
  })

  it('gives a new year sheet the colours of the device instead of the default', async () => {
    activate('personal-1')
    saveSettings({ ...getSettings()!, paletteLight: 'ocean' })
    mirror('personal-1', rows())

    await syncPalettesFromSheet('personal-1')

    expect(getPalette('light')).toBe('ocean')
    expect(setPeriodSetting).toHaveBeenCalledWith('personal-1', PALETTE_LIGHT_ROW, 'ocean')
    expect(setPeriodSetting).not.toHaveBeenCalledWith(
      'personal-1',
      PALETTE_DARK_ROW,
      expect.anything()
    )
  })

  it('keeps what is shown when the tab is not in the local mirror yet', async () => {
    // A sheet no test has mirrored: the store lives in memory across tests.
    saveSettings({
      ...getDefaultSettings(),
      spreadsheetId: 'personal-fresh',
      spreadsheets: [entry('personal-fresh')],
      paletteLight: 'ocean'
    })

    await syncPalettesFromSheet('personal-fresh')

    expect(getPalette('light')).toBe('ocean')
    expect(setPeriodSetting).not.toHaveBeenCalled()
  })

  it('never reads or applies the rows of a building sheet', async () => {
    activate('building-1')
    setWorkspaceType('building-1', 'building')
    mirror('building-1', rows('ocean', 'ocean'))

    await syncPalettesFromSheet('building-1')

    expect(getPalette('light')).toBe('emerald')
  })

  it('sends a pending pick to the personal sheet instead of replacing it', async () => {
    activate('personal-1')
    saveSettings({ ...getSettings()!, paletteLight: 'violet', palettePending: true })
    mirror('personal-1', rows('ocean', 'ocean'))

    await syncPalettesFromSheet('personal-1')

    expect(getPalette('light')).toBe('violet')
    expect(setPeriodSetting).toHaveBeenCalledWith('personal-1', PALETTE_LIGHT_ROW, 'violet')
    expect(setPeriodSetting).toHaveBeenCalledWith('personal-1', PALETTE_DARK_ROW, 'emerald')
    expect(getSettings()?.palettePending).toBeFalsy()
  })
})
