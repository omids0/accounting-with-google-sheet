import { getDefaultSettings, getSettings, saveSettings } from '../services/settings'
import type { ThemeMode } from '../types'
import {
  DEFAULT_PALETTE_ID,
  NEUTRAL_PALETTE_ID,
  paletteOrDefault,
  type PaletteId
} from './appPalettes'

export type ResolvedTheme = Exclude<ThemeMode, 'system'>

const DARK_QUERY = '(prefers-color-scheme: dark)'

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.(DARK_QUERY).matches
}

/** «مثل سیستم» becomes light or dark here; everything else reads `data-theme`. */
export function resolveTheme(theme: ThemeMode, prefersDark = systemPrefersDark()): ResolvedTheme {
  if (theme === 'system') return prefersDark ? 'dark' : 'light'

  return theme
}

let systemListenerCleanup: (() => void) | null = null

/** While the mode is «مثل سیستم», follow the OS switching light/dark live. */
function followSystem(follow: boolean): void {
  if (!follow) {
    systemListenerCleanup?.()
    systemListenerCleanup = null

    return
  }

  if (systemListenerCleanup || typeof window === 'undefined' || !window.matchMedia) return

  const query = window.matchMedia(DARK_QUERY)
  const onChange = () => applyResolvedTheme(resolveTheme('system', query.matches))

  query.addEventListener?.('change', onChange)
  systemListenerCleanup = () => query.removeEventListener?.('change', onChange)
}

/** The palette chosen for a mode («زمرد» when none, or when the stored id is unknown). */
export function getPalette(mode: ResolvedTheme): PaletteId {
  const settings = getSettings()

  return paletteOrDefault(mode === 'dark' ? settings?.paletteDark : settings?.paletteLight)
}

let neutralBeforeAccount = false

/**
 * Sign-in and the sheet pick come before the account (and so its palette) is known: they wear the
 * neutral palette, so the colour the user then lands in is not a jolt. App.tsx flips this.
 */
export function setNeutralBeforeAccount(on: boolean): void {
  if (neutralBeforeAccount === on) return

  neutralBeforeAccount = on
  reapplyTheme()
}

/**
 * Only the palette of the mode on screen is put on <html> (data-palette-light or -dark, absent for
 * the default), so a light palette can never leak into the dark theme; see styles/palettes-light.css.
 */
function applyPalette(theme: ResolvedTheme): void {
  const root = document.documentElement
  const id = neutralBeforeAccount ? NEUTRAL_PALETTE_ID : getPalette(theme)

  root.removeAttribute('data-palette-light')
  root.removeAttribute('data-palette-dark')

  if (id !== DEFAULT_PALETTE_ID) root.setAttribute(`data-palette-${theme}`, id)
}

function applyResolvedTheme(theme: ResolvedTheme): void {
  const root = document.documentElement

  root.setAttribute('data-theme', theme)
  root.style.colorScheme = theme
  applyPalette(theme)

  const meta = document.querySelector('meta[name="theme-color"]')

  if (meta) {
    // The browser bar follows the header colour of the palette on screen (a token in theme.css).
    const color = getComputedStyle(root).getPropertyValue('--meta-theme-color').trim()

    meta.setAttribute('content', color || (theme === 'dark' ? '#131210' : '#0f766e'))
  }
}

/** Re-applies the stored mode and palettes, e.g. after a palette changed (here or by a sync). */
export function reapplyTheme(): void {
  applyResolvedTheme(resolveTheme(getTheme()))
}

export function applyTheme(theme: ThemeMode): void {
  applyResolvedTheme(resolveTheme(theme))
  followSystem(theme === 'system')
}

export function getTheme(): ThemeMode {
  return getSettings()?.theme ?? 'light'
}

export function updateTheme(theme: ThemeMode): void {
  const settings = getSettings() ?? getDefaultSettings()

  saveSettings({ ...settings, theme })
  applyTheme(theme)
}

export function initTheme(): void {
  applyTheme(getTheme())
}
