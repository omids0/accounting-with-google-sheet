import { normalizeDigits } from '../utils/normalizeDigits'

/**
 * Plain integers/decimals without a leading zero and at most 15 significant
 * digits — exactly the strings Sheets would have turned into numbers under
 * USER_ENTERED without losing anything. Phone numbers (0912…), 16-digit Sayad
 * check numbers, "+98…" and dates stay text.
 */
const SAFE_NUMBER_PATTERN = /^-?(0|[1-9]\d{0,14})(\.\d{1,6})?$/

/**
 * Converts an app cell (always a string) into the value sent with
 * `valueInputOption=RAW`. Numbers stay numeric in the sheet so the user's own
 * SUM formulas keep working; everything else is stored verbatim, so a value
 * starting with "=" can never become a live formula.
 */
export function toSheetCellValue(cell: string): string | number {
  const value = cell ?? ''

  if (!SAFE_NUMBER_PATTERN.test(value)) return value

  const significant = value.replace(/^-/, '').replace('.', '').replace(/^0+/, '')

  if (significant.length > 15) return value

  return Number(value)
}

export function toSheetRowValues(row: string[]): (string | number)[] {
  return row.map(toSheetCellValue)
}

/** 1 → A, 26 → Z, 27 → AA. */
export function columnLetter(columnNumber: number): string {
  let n = Math.max(1, Math.floor(columnNumber))

  let letters = ''

  while (n > 0) {
    const remainder = (n - 1) % 26

    letters = String.fromCharCode(65 + remainder) + letters
    n = Math.floor((n - 1) / 26)
  }

  return letters
}

/**
 * Canonical form used to decide whether a row in the sheet is still the row the
 * app last saw. Sheets may hand back "1,500,000" for a cell the app wrote as
 * "1500000", or "TRUE" for "true", so formatting differences are ignored.
 */
export function normalizeCellForCompare(cell: unknown): string {
  return normalizeDigits(String(cell ?? ''))
    .replace(/[,٬،\s‌‏‎]/g, '')
    .toLowerCase()
}

export function rowsMatchForCompare(a: readonly unknown[], b: readonly unknown[]): boolean {
  const length = Math.max(a.length, b.length)

  for (let index = 0; index < length; index += 1) {
    if (normalizeCellForCompare(a[index]) !== normalizeCellForCompare(b[index])) return false
  }

  return true
}
