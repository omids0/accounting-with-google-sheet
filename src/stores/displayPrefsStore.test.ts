import { beforeEach, describe, expect, it } from 'vitest'

import { useDisplayPrefsStore } from './displayPrefsStore'
import { resetDigitStyleCache } from '../utils/digitStyle'
import {
  applyDisplayPrefs,
  DEFAULT_TEXT_SIZE,
  type DisplayPrefs,
  hapticsEnabled,
  HIGH_CONTRAST_KEY,
  readDisplayPrefs,
  remToPx,
  resolveReducedMotion,
  TEXT_SIZE_KEY,
  TEXT_SIZE_OPTIONS
} from '../utils/displayPrefs'

const root = document.documentElement

const DEFAULTS: DisplayPrefs = {
  textSize: 'md',
  reducedMotion: false,
  highContrast: false,
  persianDigits: true,
  haptics: true
}

function clearRoot() {
  for (const name of ['data-text-size', 'data-reduced-motion', 'data-contrast', 'data-digits']) {
    root.removeAttribute(name)
  }
}

describe('text size', () => {
  beforeEach(() => {
    localStorage.clear()
    resetDigitStyleCache()
    clearRoot()
    useDisplayPrefsStore.setState(readDisplayPrefs())
  })

  it('offers the four approved steps on the root font size', () => {
    expect(TEXT_SIZE_OPTIONS.map(option => [option.label, option.percent])).toEqual([
      ['کوچک', 87.5],
      ['عادی', 100],
      ['بزرگ', 112.5],
      ['خیلی بزرگ', 125]
    ])
  })

  it('defaults to «عادی» and ignores unknown stored values', () => {
    expect(readDisplayPrefs().textSize).toBe(DEFAULT_TEXT_SIZE)
    localStorage.setItem(TEXT_SIZE_KEY, 'huge')
    expect(readDisplayPrefs().textSize).toBe('md')
  })

  it('reads the raw per-device key the e2e suite seeds', () => {
    localStorage.setItem(TEXT_SIZE_KEY, 'xl')
    expect(readDisplayPrefs().textSize).toBe('xl')
  })

  it('persists a step, applies it to <html> and drops the key for «عادی»', () => {
    useDisplayPrefsStore.getState().setTextSize('lg')
    expect(localStorage.getItem(TEXT_SIZE_KEY)).toBe('lg')
    expect(root.getAttribute('data-text-size')).toBe('lg')

    useDisplayPrefsStore.getState().setTextSize('md')
    expect(localStorage.getItem(TEXT_SIZE_KEY)).toBeNull()
    expect(root.hasAttribute('data-text-size')).toBe(false)
  })

  it('converts rem to the pixels each step renders', () => {
    expect(remToPx(2.75, 'md')).toBe(44)
    expect(remToPx(2.75, 'sm')).toBe(39)
    expect(remToPx(2.75, 'lg')).toBe(50)
    expect(remToPx(2.75, 'xl')).toBe(55)
  })
})

describe('display attributes', () => {
  beforeEach(() => {
    localStorage.clear()
    clearRoot()
  })

  it('sets nothing for the defaults', () => {
    applyDisplayPrefs(DEFAULTS, root, false)
    expect(root.hasAttribute('data-text-size')).toBe(false)
    expect(root.hasAttribute('data-contrast')).toBe(false)
    expect(root.hasAttribute('data-reduced-motion')).toBe(false)
    expect(root.hasAttribute('data-digits')).toBe(false)
  })

  it('marks high contrast and Latin digits', () => {
    applyDisplayPrefs({ ...DEFAULTS, highContrast: true, persianDigits: false }, root, false)
    expect(root.getAttribute('data-contrast')).toBe('high')
    expect(root.getAttribute('data-digits')).toBe('latn')
  })

  it('stores high contrast per device through the store', () => {
    useDisplayPrefsStore.getState().setHighContrast(true)
    expect(localStorage.getItem(HIGH_CONTRAST_KEY)).toBe('1')
    expect(root.getAttribute('data-contrast')).toBe('high')
  })

  it('turns haptics off and on', () => {
    expect(hapticsEnabled()).toBe(true)
    useDisplayPrefsStore.getState().setHaptics(false)
    expect(hapticsEnabled()).toBe(false)
    useDisplayPrefsStore.getState().setHaptics(true)
    expect(hapticsEnabled()).toBe(true)
  })
})

describe('reduced motion: attribute vs media query', () => {
  beforeEach(clearRoot)

  it('reduces when either the OS or the manual switch asks', () => {
    expect(resolveReducedMotion(false, false)).toBe(false)
    expect(resolveReducedMotion(true, false)).toBe(true)
    expect(resolveReducedMotion(false, true)).toBe(true)
    expect(resolveReducedMotion(true, true)).toBe(true)
  })

  it('keeps the attribute while the OS asks, even with the switch off', () => {
    applyDisplayPrefs({ ...DEFAULTS, reducedMotion: false }, root, true)
    expect(root.getAttribute('data-reduced-motion')).toBe('reduce')
  })

  it('adds the attribute from the manual switch without the OS setting', () => {
    applyDisplayPrefs({ ...DEFAULTS, reducedMotion: true }, root, false)
    expect(root.getAttribute('data-reduced-motion')).toBe('reduce')

    applyDisplayPrefs({ ...DEFAULTS, reducedMotion: false }, root, false)
    expect(root.hasAttribute('data-reduced-motion')).toBe(false)
  })
})
