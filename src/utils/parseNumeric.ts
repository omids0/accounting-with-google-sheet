import { normalizeDigits } from './normalizeDigits'

/** Arabic/Persian decimal separator «٫». */
const ARABIC_DECIMAL_SEPARATOR = '٫'

/** Thousands separators: ASCII comma, Arabic comma «،», Arabic thousands separator «٬». */
const THOUSANDS_SEPARATORS = /[,،٬]/g

/** Whitespace plus invisible bidi/joiner marks that sheets and keyboards insert around numbers. */
const INVISIBLE_CHARS = /[\s ​-‏‪-‮⁦-⁩؜﻿]/g

/** Unicode minus «−», small hyphen-minus and fullwidth hyphen-minus. */
const MINUS_VARIANTS = /[−﹣－]/g

/** Plain decimal only — no hex (0x10), exponent (1e9), Infinity, or stray characters. */
const PLAIN_DECIMAL = /^[+-]?(\d+\.?\d*|\.\d+)$/

function normalizeNumericText(raw: string): string {
  let text = normalizeDigits(raw)
    .replace(INVISIBLE_CHARS, '')
    .replace(MINUS_VARIANTS, '-')
    .replace(THOUSANDS_SEPARATORS, '')

  const parts = text.split(ARABIC_DECIMAL_SEPARATOR)

  // A single «٫» is a decimal point; several can only be (legacy) digit grouping.
  text = parts.join(parts.length === 2 ? '.' : '')

  // RTL layouts often render negatives with the minus after the digits: «۱۲۳-».
  if (/^[+]?[\d.]+-$/.test(text)) {
    text = `-${text.slice(0, -1).replace(/^\+/, '')}`
  }

  return text
}

/**
 * Parse a user- or sheet-supplied number. Returns `null` when the value is empty
 * or not a plain decimal number, so validating callers can tell "invalid" apart from 0.
 */
export function parseNumericStrict(value: string | number | undefined | null): number | null {
  if (value == null) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null

  const normalized = normalizeNumericText(String(value))

  if (!PLAIN_DECIMAL.test(normalized)) return null

  const parsed = Number(normalized)

  if (!Number.isFinite(parsed)) return null

  // `Number(x) || 0` used to fold «-0» into 0; keep that so it never renders as «−۰».
  return parsed === 0 ? 0 : parsed
}

/** Lenient variant of {@link parseNumericStrict}: empty or invalid input reads as 0. */
export function parseNumeric(value: string | number | undefined | null): number {
  return parseNumericStrict(value) ?? 0
}
