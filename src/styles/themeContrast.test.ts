import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(__dirname, 'theme.css'), 'utf8')

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

/** The light-theme token (the first declaration, in :root). */
function lightToken(name: string) {
  const match = css.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`))

  if (!match) throw new Error(`token ${name} not found`)

  return match[1]
}

describe('light theme danger colours', () => {
  const danger = lightToken('--color-danger')
  const expense = lightToken('--color-expense')

  it('reads at 4.5:1 or more as text on the danger and expense tints', () => {
    expect(ratio(danger, lightToken('--color-danger-bg'))).toBeGreaterThanOrEqual(4.5)
    expect(ratio(expense, lightToken('--color-expense-bg'))).toBeGreaterThanOrEqual(4.5)
  })

  it('reads at 4.5:1 or more on the page and the card surface', () => {
    expect(ratio(danger, lightToken('--color-bg'))).toBeGreaterThanOrEqual(4.5)
    expect(ratio(danger, lightToken('--color-surface'))).toBeGreaterThanOrEqual(4.5)
  })

  it('still carries white text as a solid fill', () => {
    expect(ratio('#ffffff', danger)).toBeGreaterThanOrEqual(4.5)
  })
})
