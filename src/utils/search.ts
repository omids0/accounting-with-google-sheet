import { normalizeDigits } from './normalizeDigits'

/** Arabic letter forms that Persian keyboards/sources mix with the Persian ones. */
const ARABIC_TO_PERSIAN: Record<string, string> = {
  ي: 'ی',
  ى: 'ی',
  ك: 'ک',
  ة: 'ه'
}

/** ZWNJ, ZWJ, tatweel «ـ», bidi marks and BOM — invisible differences that break matching. */
const IGNORED_CHARS = /[‌‍ـ‎‏؜﻿]/g

/** Digit-group separators: ASCII comma, Arabic comma «،», Arabic thousands separator «٬». */
const THOUSANDS_BETWEEN_DIGITS = /(\d)[,،٬](?=\d)/g

export function normalizeSearchText(value: string): string {
  return normalizeDigits(value.normalize('NFC'))
    .replace(/[يىكة]/g, ch => ARABIC_TO_PERSIAN[ch] ?? ch)
    .replace(IGNORED_CHARS, '')
    .replace(THOUSANDS_BETWEEN_DIGITS, '$1')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export function matchSearch(
  query: string,
  ...parts: (string | number | undefined | null)[]
): boolean {
  const normalizedQuery = normalizeSearchText(query)

  if (!normalizedQuery) return true

  const haystack = parts
    .filter(part => part != null && part !== '')
    .map(part => normalizeSearchText(String(part)))
    .join(' ')

  return haystack.includes(normalizedQuery)
}
