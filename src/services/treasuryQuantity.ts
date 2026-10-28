import { AMOUNT_DIGITS_ONLY_MESSAGE, amountInputRejection } from '../utils/amountInput'
import { normalizeDigits } from '../utils/normalizeDigits'

/** Above this many units (coins, shares, grams) the field asks the user to look again. */
export const LARGE_QUANTITY = 100_000

/** Shown, without blocking, under a quantity above `LARGE_QUANTITY`. */
export const LARGE_QUANTITY_HINT = 'مقدار خیلی زیاد است؛ یک بار دیگر بررسی کن'

/**
 * The notice for what `sanitizeQuantityText` drops without a word: a minus sign («-۳» is kept
 * as 3) or scientific notation («1e3» is read as 13). Same texts as the money field.
 */
/** The money field's minus-sign notice, worded for a quantity. */
export const QUANTITY_NEGATIVE_MESSAGE = 'علامت منفی پذیرفته نمی‌شود؛ مقدار را مثبت وارد کنید'

export function quantityInputNotice(raw: string): string {
  const rejected = amountInputRejection(raw)

  if (rejected === 'negative') return QUANTITY_NEGATIVE_MESSAGE

  return rejected === 'digits' ? AMOUNT_DIGITS_ONLY_MESSAGE : ''
}

/** A non-blocking note for an absurd quantity; '' otherwise. */
export function largeQuantityHint(qty: number | ''): string {
  return typeof qty === 'number' && qty > LARGE_QUANTITY ? LARGE_QUANTITY_HINT : ''
}

/**
 * Keeps what the user typed as a quantity with at most `decimals` fraction digits
 * (none when 0). Persian digits and the Persian decimal sign are accepted.
 */
export function sanitizeQuantityText(text: string, decimals: number): string {
  const normalized = normalizeDigits(text)
    .replace(/٫/g, '.')
    .replace(/[^\d.]/g, '')
  const [whole, ...rest] = normalized.split('.')

  if (decimals <= 0 || rest.length === 0) return whole

  return `${whole}.${rest.join('').slice(0, decimals)}`
}

/** Positive number, or '' while empty or zero. */
export function parseQuantityText(text: string): number | '' {
  const value = Number(text)

  return text && Number.isFinite(value) && value > 0 ? value : ''
}

/** True when `qty` needs no more than `decimals` fraction digits. */
export function quantityFitsDecimals(qty: number, decimals: number): boolean {
  if (!Number.isFinite(qty)) return false

  const factor = 10 ** Math.max(0, decimals)

  return Math.abs(Math.round(qty * factor) - qty * factor) < 1e-6
}

/** The error to show for a quantity, or null when it is valid for the asset's decimals. */
export function quantityError(qty: number, decimals: number): string | null {
  if (!qty || qty <= 0) return 'مقدار را وارد کنید'
  if (!quantityFitsDecimals(qty, decimals)) {
    return decimals > 0
      ? `مقدار حداکثر ${decimals.toLocaleString('fa-IR')} رقم اعشار می‌گیرد`
      : 'مقدار باید عدد صحیح باشد'
  }

  return null
}

export function formatQuantityValue(qty: number, decimals: number): string {
  return qty.toLocaleString('fa-IR', { maximumFractionDigits: Math.max(0, decimals) })
}
