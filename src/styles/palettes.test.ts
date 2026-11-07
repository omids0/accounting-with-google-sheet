import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { PALETTE_IDS } from '../utils/appPalettes'

const lightCss = readFileSync(resolve(__dirname, 'palettes-light.css'), 'utf8')
const darkCss = readFileSync(resolve(__dirname, 'palettes-dark.css'), 'utf8')

function channel(value: number) {
  const c = value / 255

  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))

  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function ratio(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)

  return (x + 0.05) / (y + 0.05)
}

/** The declarations of one palette's block, e.g. `--color-primary: #1d4ed8`. */
function blockOf(css: string, selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`)

  if (start === -1) throw new Error(`no block for ${selector}`)

  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start))

  return Object.fromEntries(
    [...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(match => [match[1], match[2].trim()])
  )
}

const OTHERS = PALETTE_IDS.filter(id => id !== 'emerald')

/** Surfaces the dark theme draws on (theme.css `[data-theme='dark']`). */
const DARK_SURFACE = '#141412'
const DARK_PAGE = '#0a0a09'
const DARK_ON_PRIMARY = '#1a1408'
const WHITE = '#ffffff'

describe('palettes: every non-default id has a block per mode', () => {
  it.each(OTHERS)('%s', id => {
    expect(() => blockOf(lightCss, `:root:where([data-palette-light='${id}'])`)).not.toThrow()
    expect(() =>
      blockOf(darkCss, `[data-theme='dark']:where([data-palette-dark='${id}'])`)
    ).not.toThrow()
  })

  it('has no block for an id the picker does not offer', () => {
    const ids = [...lightCss.matchAll(/data-palette-light='([a-z]+)'/g)].map(match => match[1])

    expect(ids.every(id => (PALETTE_IDS as readonly string[]).includes(id))).toBe(true)
  })
})

describe('light palettes keep text readable (4.5:1, WCAG AA)', () => {
  it.each(OTHERS)('%s: white text on every header, button and hero colour', id => {
    const block = blockOf(lightCss, `:root:where([data-palette-light='${id}'])`)

    for (const token of ['--color-primary', '--color-primary-dark', '--brand-gradient-end']) {
      expect(ratio(WHITE, block[token]), `${id} ${token}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it.each(OTHERS)(
    '%s: the primary and dark primary read as text on the page, cards and tint',
    id => {
      const block = blockOf(lightCss, `:root:where([data-palette-light='${id}'])`)

      for (const surface of [block['--color-bg'], WHITE, block['--color-accent-soft']]) {
        expect(
          ratio(block['--color-primary'], surface),
          `${id} primary on ${surface}`
        ).toBeGreaterThanOrEqual(4.5)
        expect(
          ratio(block['--color-primary-dark'], surface),
          `${id} primary-dark on ${surface}`
        ).toBeGreaterThanOrEqual(4.5)
        expect(
          ratio(block['--color-text-muted'], surface),
          `${id} muted on ${surface}`
        ).toBeGreaterThanOrEqual(4.5)
      }
      expect(
        ratio(block['--color-text'], block['--color-bg']),
        `${id} text`
      ).toBeGreaterThanOrEqual(7)
    }
  )
})

describe('dark palettes keep text readable', () => {
  it.each(OTHERS)('%s: the accent reads on the page, cards and tint (4.5:1)', id => {
    const block = blockOf(darkCss, `[data-theme='dark']:where([data-palette-dark='${id}'])`)

    for (const surface of [DARK_PAGE, DARK_SURFACE, block['--color-accent-soft']]) {
      expect(
        ratio(block['--color-primary'], surface),
        `${id} accent on ${surface}`
      ).toBeGreaterThanOrEqual(4.5)
    }
  })

  it.each(OTHERS)('%s: dark text on the filled button, white text on the header', id => {
    const block = blockOf(darkCss, `[data-theme='dark']:where([data-palette-dark='${id}'])`)

    for (const fill of [block['--color-primary'], block['--palette-b2']]) {
      expect(ratio(DARK_ON_PRIMARY, fill), `${id} button text on ${fill}`).toBeGreaterThanOrEqual(
        4.5
      )
    }
    for (const header of [block['--palette-h1'], block['--palette-h2']]) {
      expect(ratio(WHITE, header), `${id} white on ${header}`).toBeGreaterThanOrEqual(4.5)
    }
  })
})
