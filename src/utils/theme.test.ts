import { describe, expect, it } from 'vitest'

import { applyTheme, resolveTheme } from './theme'

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
