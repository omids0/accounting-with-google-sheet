import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  applyTheme,
  getPalette,
  reapplyTheme,
  resolveTheme,
  setNeutralBeforeAccount
} from './theme'
import { getDefaultSettings, saveSettings } from '../services/settings'

describe('theme «مثل سیستم»', () => {
  it('resolves to the OS scheme and leaves explicit modes alone', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
    expect(resolveTheme('light', true)).toBe('light')
  })

  it('always writes a resolved value to data-theme', () => {
    applyTheme('system')
    expect(['light', 'dark']).toContain(document.documentElement.getAttribute('data-theme'))
    applyTheme('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })
})

describe('theme palettes on <html>', () => {
  const root = document.documentElement

  beforeEach(() => {
    localStorage.clear()
    root.removeAttribute('data-palette-light')
    root.removeAttribute('data-palette-dark')
  })

  it('puts only the palette of the mode on screen there', () => {
    saveSettings({ ...getDefaultSettings(), paletteLight: 'ocean', paletteDark: 'brown' })

    applyTheme('light')
    expect(root.getAttribute('data-palette-light')).toBe('ocean')
    expect(root.hasAttribute('data-palette-dark')).toBe(false)

    applyTheme('dark')
    expect(root.getAttribute('data-palette-dark')).toBe('brown')
    expect(root.hasAttribute('data-palette-light')).toBe(false)
  })

  it('leaves the default palette and unknown ids without an attribute', () => {
    saveSettings({ ...getDefaultSettings(), paletteLight: 'emerald', paletteDark: 'not-a-palette' })

    applyTheme('light')
    expect(root.hasAttribute('data-palette-light')).toBe(false)

    applyTheme('dark')
    expect(root.hasAttribute('data-palette-dark')).toBe(false)
    expect(getPalette('dark')).toBe('emerald')
  })

  it('follows a mode flip (the sidebar switch) with the other mode\u2019s palette', () => {
    saveSettings({ ...getDefaultSettings(), paletteLight: 'violet', paletteDark: 'caspian' })

    applyTheme('light')
    reapplyTheme()
    expect(root.getAttribute('data-palette-light')).toBe('violet')
  })
})

describe('neutral palette before the account is known', () => {
  const root = document.documentElement

  beforeEach(() => {
    localStorage.clear()
    root.removeAttribute('data-palette-light')
    root.removeAttribute('data-palette-dark')
  })

  afterEach(() => setNeutralBeforeAccount(false))

  it('wears the neutral palette whatever the stored one is, then gives the stored one back', () => {
    saveSettings({ ...getDefaultSettings(), paletteLight: 'ocean', paletteDark: 'brown' })
    applyTheme('light')
    expect(root.getAttribute('data-palette-light')).toBe('ocean')

    setNeutralBeforeAccount(true)
    expect(root.getAttribute('data-palette-light')).toBe('graphite')

    setNeutralBeforeAccount(false)
    expect(root.getAttribute('data-palette-light')).toBe('ocean')
  })

  it('is neutral in the dark mode too, and never touches what is stored', () => {
    saveSettings({ ...getDefaultSettings(), theme: 'dark', paletteDark: 'brown' })
    applyTheme('dark')
    setNeutralBeforeAccount(true)

    expect(root.getAttribute('data-palette-dark')).toBe('graphite')
    expect(getPalette('dark')).toBe('brown')
  })
})
