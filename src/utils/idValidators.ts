import { normalizeDigits } from './normalizeDigits'

/** Luhn checksum of a digit string; Iranian bank cards are Luhn-valid. */
export function passesLuhn(digits: string): boolean {
  if (!/^\d+$/.test(digits)) return false

  let sum = 0

  for (let i = 0; i < digits.length; i += 1) {
    let digit = Number(digits[digits.length - 1 - i])

    if (i % 2 === 1) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
  }

  return sum % 10 === 0
}

/**
 * The Sheba as «IR» + 24 digits, or `null` when it is not one. Spaces, lowercase and
 * Persian digits are accepted; the «IR» prefix may be left out. The IBAN mod-97 check must hold.
 */
export function normalizeSheba(raw: string): string | null {
  const text = normalizeDigits(raw).replace(/[\s-]/g, '').toUpperCase()
  const sheba = /^\d{24}$/.test(text) ? `IR${text}` : text

  if (!/^IR\d{24}$/.test(sheba)) return null

  // Move «IR» + check digits to the end; I = 18, R = 27.
  const rearranged = `${sheba.slice(4)}1827${sheba.slice(2, 4)}`

  let remainder = 0

  for (const digit of rearranged) remainder = (remainder * 10 + Number(digit)) % 97

  return remainder === 1 ? sheba : null
}

/**
 * An Iranian phone as plain digits starting with 0: a mobile («09XXXXXXXXX», also typed
 * «+98 9…» or «0098 9…») or a landline with its area code (10–11 digits). `null` otherwise.
 */
export function normalizeIranPhone(raw: string): string | null {
  let text = normalizeDigits(raw).replace(/[\s\-().]/g, '')

  if (text.startsWith('+98')) text = `0${text.slice(3)}`
  else if (text.startsWith('0098')) text = `0${text.slice(4)}`
  else if (/^98\d{10}$/.test(text)) text = `0${text.slice(2)}`

  if (/^09\d{9}$/.test(text)) return text

  return /^0[1-8]\d{8,9}$/.test(text) ? text : null
}

/**
 * Any phone the contacts list takes: an Iranian number in its plain 0-prefixed form, or an
 * international one as «+» and 7–15 digits («+1 202 555 0100» is «+12025550100»). `null` otherwise.
 */
export function normalizePhone(raw: string): string | null {
  const iranian = normalizeIranPhone(raw)

  if (iranian) return iranian

  const text = normalizeDigits(raw).replace(/[\s\-().]/g, '')

  return /^\+\d{7,15}$/.test(text) ? text : null
}

/**
 * Latin digits only, for a field that holds a plain number («شماره چک»). `changed` is true
 * when other characters were dropped; Persian digits turn into Latin ones silently.
 */
export function digitsOnly(raw: string): { value: string; changed: boolean } {
  const latin = normalizeDigits(raw).trim()
  const value = latin.replace(/\D/g, '')

  return { value, changed: value !== latin }
}
