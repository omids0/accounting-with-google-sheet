import { getDefaultSettings, getSettings, saveSettings } from '../services/settings'
import type { ThemeMode } from '../types'

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

function applyResolvedTheme(theme: ResolvedTheme): void {
  const root = document.documentElement

  root.setAttribute('data-theme', theme)
  root.style.colorScheme = theme

  const meta = document.querySelector('meta[name="theme-color"]')

  if (meta) {
    meta.setAttribute('content', theme === 'dark' ? '#131210' : '#0f766e')
  }
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
