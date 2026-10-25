import { describe, expect, it } from 'vitest'

import { normalizeDigits } from './normalizeDigits'
import { parseNumericStrict } from './parseNumeric'

function rng(seed: number) {
  let state = seed

  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296

    return state / 4294967296
  }
}

function randomText(next: () => number, alphabet: string[], maxLength: number): string {
  const length = Math.floor(next() * (maxLength + 1))

  return Array.from({ length }, () => alphabet[Math.floor(next() * alphabet.length)]).join('')
}

/** The pass-by-pass versions that ran on every value before the plain-ASCII shortcuts. */
function legacyNormalizeDigits(text: string): string {
  return text
    .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
}

function legacyParseNumericStrict(value: string | number | undefined | null): number | null {
  if (value == null) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null

  let text = legacyNormalizeDigits(String(value))
    .replace(/[\s​-‏‪-‮⁦-⁩؜﻿]/g, '')
    .replace(/[−﹣－]/g, '-')
    .replace(/[,،٬]/g, '')
  const parts = text.split('٫')

  text = parts.join(parts.length === 2 ? '.' : '')

  if (/^[+]?[\d.]+-$/.test(text)) text = `-${text.slice(0, -1).replace(/^\+/, '')}`
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(text)) return null

  const parsed = Number(text)

  if (!Number.isFinite(parsed)) return null

  return parsed === 0 ? 0 : parsed
}

describe('normalizeDigits shortcut', () => {
  it('matches the two-pass version on mixed text', () => {
    const next = rng(5)
    const alphabet = [...'abc 09-,.', ...'۰۱۵۹', ...'٠١٥٩', 'ی']

    for (let run = 0; run < 20000; run += 1) {
      const text = randomText(next, alphabet, 10)

      expect(normalizeDigits(text)).toBe(legacyNormalizeDigits(text))
    }
  })
})

describe('parseNumericStrict shortcut', () => {
  it('matches the full normalization on random numeric-looking text', () => {
    const next = rng(9)
    const alphabet = [
      ...'0123456789',
      ...'0123456789',
      '.',
      '.',
      '+',
      '-',
      ',',
      ' ',
      '٫',
      '،',
      '٬',
      '۱',
      '٢',
      '−',
      '‏',
      'e',
      'x',
      'a'
    ]

    for (let run = 0; run < 40000; run += 1) {
      const text = randomText(next, alphabet, 8)

      expect(parseNumericStrict(text)).toBe(legacyParseNumericStrict(text))
    }
  })

  it('keeps the edges of the shortcut', () => {
    const edges = [
      '0',
      '-0',
      '+0',
      '5.',
      '.5',
      '007',
      '-12.50',
      '+3',
      '1e5',
      '0x10',
      '',
      '-',
      '+.',
      '9'.repeat(400)
    ]

    for (const text of edges) {
      expect(parseNumericStrict(text)).toBe(legacyParseNumericStrict(text))
    }

    expect(Object.is(parseNumericStrict('-0'), 0)).toBe(true)
    expect(parseNumericStrict('9'.repeat(400))).toBeNull()
  })
})
