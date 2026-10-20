import { normalizeDigits } from './normalizeDigits'

/** Digits the dial pad accepts; the amount is a plain digit string until it is confirmed. */
export const KEYPAD_MAX_DIGITS = 12

/** The «+» chips under the display. */
export const KEYPAD_QUICK_ADDS = [100_000, 1_000_000, 10_000_000]

export type KeypadKey =
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '000'
  | 'back'
  | 'clear'

/** The number a digit string stands for; an empty string is 0. */
export function keypadNumber(digits: string): number {
  return Number(digits) || 0
}

/** The digit string after `key`; unchanged when it would pass `KEYPAD_MAX_DIGITS`. */
export function pressKeypadKey(digits: string, key: KeypadKey): string {
  if (key === 'clear') return ''
  if (key === 'back') return digits.slice(0, -1)

  // «۰۰۰» on an empty display would only add zeros in front of nothing.
  const next = key === '000' ? (digits ? digits + key : '') : (digits === '0' ? '' : digits) + key

  return next.length > KEYPAD_MAX_DIGITS ? digits : next
}

/** The digit string after a quick add; unchanged when the sum is too long. */
export function addToKeypad(digits: string, amount: number): string {
  const next = String(keypadNumber(digits) + amount)

  return next.length > KEYPAD_MAX_DIGITS ? digits : next
}

/** A hardware key as a dial pad key, or null when the pad ignores it. */
export function keypadKeyFromEvent(key: string): KeypadKey | null {
  // A Persian keyboard layout types ۰-۹.
  const digit = normalizeDigits(key)

  if (/^[0-9]$/.test(digit)) return digit as KeypadKey
  if (key === 'Backspace') return 'back'

  return null
}
