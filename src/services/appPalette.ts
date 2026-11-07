import { getDefaultSettings, getSettings, saveSettings } from './settings'
import { PERIOD_SETTINGS_SHEET } from './sheetNames'
import { getSheetAllRows } from './spreadsheetStore'
import { isPersonalWorkspace } from './workspace'
import { DEFAULT_PALETTE_ID, paletteOrDefault, type PaletteId } from '../utils/appPalettes'
import { getPalette, reapplyTheme, type ResolvedTheme } from '../utils/theme'

/**
 * «رنگ تم»: the palette of each mode follows the account across devices. It lives in the
 * personal spreadsheet's key/value tab «تنظیمات دوره» (two rows, ids not labels) and is cached in
 * `accounting_settings` so the first paint needs no network. The mode itself (light/dark/system)
 * stays per device: the sidebar switch flips it.
 *
 * Every personal sheet carries the rows (a new year's sheet is a new personal sheet), so the colour
 * follows the sheet the user has open on every device: the phone app and the web app agree as long
 * as both are on the same sheet.
 */
export const PALETTE_LIGHT_ROW = 'رنگ تم روشن'

export const PALETTE_DARK_ROW = 'رنگ تم تاریک'

const MODES: readonly ResolvedTheme[] = ['light', 'dark']

function rowKeyOf(mode: ResolvedTheme): string {
  return mode === 'dark' ? PALETTE_DARK_ROW : PALETTE_LIGHT_ROW
}

/**
 * The two palettes the data rows of «تنظیمات دوره» name. A mode whose row is missing or blank is
 * `null` (the sheet has no opinion yet); a row naming an unknown id means the default.
 */
export function palettesOfRows(
  rows: readonly (readonly unknown[])[]
): Record<ResolvedTheme, PaletteId | null> {
  const valueOf = (key: string) =>
    String(rows.find(row => String(row[0] ?? '').trim() === key)?.[1] ?? '').trim()

  const paletteOf = (key: string) => {
    const value = valueOf(key)

    return value ? paletteOrDefault(value) : null
  }

  return { light: paletteOf(PALETTE_LIGHT_ROW), dark: paletteOf(PALETTE_DARK_ROW) }
}

/**
 * Any personal sheet holds the palette. A building, shared account or child sheet is read by
 * other people, and a child is read-only: there the cached choice just applies.
 */
export function isPaletteSheet(spreadsheetId: string): boolean {
  return Boolean(spreadsheetId) && isPersonalWorkspace(spreadsheetId)
}

const listeners = new Set<() => void>()

/** For `useSyncExternalStore`: the settings card redraws when a sync changes a palette. */
export function subscribePalettes(listener: () => void): () => void {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

export function getPalettesSnapshot(): string {
  return `${getPalette('light')}|${getPalette('dark')}|${getSettings()?.palettePending ? 1 : 0}`
}

function notifyPalettes(): void {
  reapplyTheme()
  listeners.forEach(listener => listener())
}

function markPending(pending: boolean): void {
  const settings = getSettings()

  if (!settings || Boolean(settings.palettePending) === pending) return

  saveSettings({ ...settings, palettePending: pending || undefined })
  // The settings card shows a note while a pick is waiting for the personal sheet.
  listeners.forEach(listener => listener())
}

/** Writes the rows of these modes to the personal sheet; offline or elsewhere it stays pending. */
async function pushPalettes(modes: readonly ResolvedTheme[]): Promise<void> {
  const spreadsheetId = getSettings()?.spreadsheetId ?? ''

  if (!isPaletteSheet(spreadsheetId)) {
    markPending(true)

    return
  }

  try {
    const { setPeriodSetting } = await import('./periodSettings')

    for (const mode of modes)
      await setPeriodSetting(spreadsheetId, rowKeyOf(mode), getPalette(mode))
    markPending(false)
  } catch {
    // The picker must never fail: the pick is saved here and goes out on the next personal pull.
    markPending(true)
  }
}

/** The settings card's choice: applies at once, then goes to the sheet without blocking. */
export async function changePalette(mode: ResolvedTheme, id: PaletteId): Promise<void> {
  if (getPalette(mode) === id) return

  const settings = getSettings() ?? getDefaultSettings()

  saveSettings({ ...settings, [mode === 'dark' ? 'paletteDark' : 'paletteLight']: id })
  notifyPalettes()
  await pushPalettes([mode])
}

/**
 * After every pull of a personal sheet (changed or not, so a start-up check is enough): the sheet's
 * palettes replace the cached ones (the sheet wins, as for the workspace type). It reads the local
 * mirror the pull just filled, so it costs no request. A mode the sheet has no row for keeps the
 * device's choice and writes it to the sheet, so a new year's sheet inherits the colours instead of
 * starting at the default. A pick still pending goes out first.
 */
export async function syncPalettesFromSheet(spreadsheetId: string): Promise<void> {
  if (!isPaletteSheet(spreadsheetId)) return

  const settings = getSettings()

  if (!settings) return

  if (settings.palettePending) {
    await pushPalettes(MODES)

    return
  }

  const rows = getSheetAllRows(spreadsheetId, PERIOD_SETTINGS_SHEET)

  // The tab was not downloaded (yet): keep what is shown.
  if (!rows) return

  const remote = palettesOfRows(rows)
  const light = remote.light ?? getPalette('light')
  const dark = remote.dark ?? getPalette('dark')

  if (light !== getPalette('light') || dark !== getPalette('dark')) {
    saveSettings({ ...settings, paletteLight: light, paletteDark: dark })
    notifyPalettes()
  }

  const unwritten = MODES.filter(
    mode => remote[mode] === null && (mode === 'dark' ? dark : light) !== DEFAULT_PALETTE_ID
  )

  if (unwritten.length) await pushPalettes(unwritten)
}
