import { getDefaultSettings, getSettings, saveSettings } from '../services/settings'
import type { ThemeMode } from '../types'

export function applyTheme(theme: ThemeMode): void {
  const root = document.documentElement

  root.setAttribute('data-theme', theme)
  root.style.colorScheme = theme

  const meta = document.querySelector('meta[name="theme-color"]')

  if (meta) {
    meta.setAttribute('content', theme === 'dark' ? '#134e4a' : '#0f766e')
  }
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
