import { normalizeDigits } from '../utils/normalizeDigits'

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
