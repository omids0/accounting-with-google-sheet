import { getDefaultSettings, getSettings, saveSettings } from './settings'
import { PERIOD_SETTINGS_SHEET } from './sheetNames'
import { isPersonalWorkspace, personalSpreadsheet } from './workspace'
import { paletteOrDefault, type PaletteId } from '../utils/appPalettes'
import { getPalette, reapplyTheme, type ResolvedTheme } from '../utils/theme'

/**
 * «رنگ تم»: the palette of each mode follows the account across devices. It lives in the
 * personal spreadsheet's key/value tab «تنظیمات دوره» (two rows, ids not labels) and is cached in
 * `accounting_settings` so the first paint needs no network. The mode itself (light/dark/system)
 * stays per device: the sidebar switch flips it.
 */
export const PALETTE_LIGHT_ROW = 'رنگ تم روشن'

export const PALETTE_DARK_ROW = 'رنگ تم تاریک'

const MODES: readonly ResolvedTheme[] = ['light', 'dark']

function rowKeyOf(mode: ResolvedTheme): string {
  return mode === 'dark' ? PALETTE_DARK_ROW : PALETTE_LIGHT_ROW
}

/** The two palettes the data rows of «تنظیمات دوره» name; a missing or unknown value = default. */
export function palettesOfRows(
  rows: readonly (readonly unknown[])[]
): Record<ResolvedTheme, PaletteId> {
  const valueOf = (key: string) =>
    String(rows.find(row => String(row[0] ?? '').trim() === key)?.[1] ?? '').trim()

  return {
    light: paletteOrDefault(valueOf(PALETTE_LIGHT_ROW)),
    dark: paletteOrDefault(valueOf(PALETTE_DARK_ROW))
  }
}

/**
 * Only the manager's own spreadsheet holds the palette. A building, shared account or child sheet
 * is read by other people, and a child is read-only: there the cached choice just applies.
 */
export function isPaletteSheet(spreadsheetId: string): boolean {
  if (!spreadsheetId || !isPersonalWorkspace(spreadsheetId)) return false

  const own = personalSpreadsheet(getSettings()?.spreadsheets ?? [])

  return !own || own.id === spreadsheetId
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
 * After every pull of the personal sheet: the sheet's palettes replace the cached ones (the
 * sheet wins, as for the workspace type). A pick still pending from another sheet goes out first.
 * A failed read changes nothing, so going offline never resets the colours.
 */
export async function syncPalettesFromSheet(spreadsheetId: string): Promise<void> {
  if (!isPaletteSheet(spreadsheetId)) return

  const settings = getSettings()

  if (!settings) return

  if (settings.palettePending) {
    await pushPalettes(MODES)

    return
  }

  try {
    const { fetchSheetRows } = await import('./sheets')
    const remote = palettesOfRows(await fetchSheetRows(spreadsheetId, PERIOD_SETTINGS_SHEET))

    if (remote.light === getPalette('light') && remote.dark === getPalette('dark')) return

    saveSettings({ ...settings, paletteLight: remote.light, paletteDark: remote.dark })
    notifyPalettes()
  } catch {
    // Offline or the tab is missing: keep what is shown.
  }
}
