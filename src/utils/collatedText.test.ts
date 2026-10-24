import { describe, expect, it } from 'vitest'

import { collatedText, compareCollated } from './collatedText'

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

const sign = (n: number) => Math.sign(n)

describe('compareCollated', () => {
  it('gives the sign of localeCompare for dates, timestamps and their punctuation', () => {
    const next = rng(11)
    const alphabet = [...'0123456789', '-', ':', '.', 'T', 'Z', ' ']

    for (let run = 0; run < 20000; run += 1) {
      const a = randomText(next, alphabet, 8)
      const b = randomText(next, alphabet, 8)

      expect(sign(compareCollated(collatedText(a), collatedText(b)))).toBe(sign(a.localeCompare(b)))
    }
  })

  it('gives the sign of localeCompare for real-looking dates and timestamps', () => {
    const next = rng(5)
    const day = () =>
      `${2020 + Math.floor(next() * 7)}-${String(1 + Math.floor(next() * 12)).padStart(
        2,
        '0'
      )}-${String(1 + Math.floor(next() * 28)).padStart(2, '0')}`
    const stamp = () => `${day()}T${String(Math.floor(next() * 24)).padStart(2, '0')}:10:20.000Z`
    const samples = [
      ...Array.from({ length: 150 }, day),
      ...Array.from({ length: 150 }, stamp),
      '',
      '2026-1-5',
      '2026-10-24 10:20',
      '2026-10-24T10:20:30Z'
    ]

    for (const a of samples) {
      for (const b of samples) {
        expect(sign(compareCollated(collatedText(a), collatedText(b)))).toBe(
          sign(a.localeCompare(b))
        )
      }
    }
  })

  it('still matches localeCompare when letters, Persian digits or other scripts are involved', () => {
    const next = rng(23)
    const alphabet = [...'0123456789-:.TZ aBzZ', '۱', '۲', '۰', 'ب', 'ا', 'ي', 'ی', '٣']

    for (let run = 0; run < 20000; run += 1) {
      const a = randomText(next, alphabet, 6)
      const b = randomText(next, alphabet, 6)

      expect(sign(compareCollated(collatedText(a), collatedText(b)))).toBe(sign(a.localeCompare(b)))
    }
  })

  it('only plain text gets a key', () => {
    expect(collatedText('2026-10-24').key).not.toBeNull()
    expect(collatedText('').key).toBe('')
    expect(collatedText('۱۴۰۵-۰۷-۰۲').key).toBeNull()
    expect(collatedText('abc').key).toBeNull()
  })
})
