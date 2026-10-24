import { persianDigitsEnabled } from './digitStyle'

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹'

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'

const NON_ASCII_DIGIT = /[۰-۹٠-٩]/

/** Convert Persian/Arabic numerals in a string to ASCII digits. */
export function normalizeDigits(text: string): string {
  // Most strings (ids, dates, plain amounts, Latin words) have none: skip both replace passes.
  if (!NON_ASCII_DIGIT.test(text)) return text

  return text
    .replace(/[۰-۹]/g, d => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, d => String(ARABIC_DIGITS.indexOf(d)))
}

/**
 * Display digits for a string («2.0.1» → «۲.۰.۱»). With «ارقام فارسی» off
 * (Settings › نمایش) the same call returns Latin digits instead.
 */
export function toPersianDigits(text: string): string {
  if (!persianDigitsEnabled()) return normalizeDigits(text)

  return text.replace(/\d/g, d => PERSIAN_DIGITS[Number(d)])
}
