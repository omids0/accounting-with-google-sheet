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

/**
 * Text that needs no cleaning at all: no Arabic/Persian-Indic digits, Arabic letter variants,
 * invisible marks or digit-group commas, and no whitespace other than single inner spaces.
 * Most words of a long list are like this, so the seven passes below can be skipped for them.
 */
const NEEDS_CLEANING = new RegExp(
  `[۰-۹٠-٩يىكة,،٬]|${IGNORED_CHARS.source}|[^\\S ]|\\s\\s|^\\s|\\s$`
)

export function normalizeSearchText(value: string): string {
  const composed = value.normalize('NFC')

  if (!NEEDS_CLEANING.test(composed)) return composed.toLowerCase()

  return normalizeDigits(composed)
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
