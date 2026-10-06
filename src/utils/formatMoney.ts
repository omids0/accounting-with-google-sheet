import { getSettings, getDefaultSettings } from '../services/settings'
import { getStorageVersion } from '../services/storage'
import type { CurrencyUnit } from '../types'

export const CURRENCY_OPTIONS: { value: CurrencyUnit; label: string; symbol: string }[] = [
  { value: 'toman', label: 'تومان', symbol: 'تومان' },
  { value: 'rial', label: 'ریال', symbol: 'ریال' },
  { value: 'usd', label: 'دلار', symbol: '$' },
  { value: 'eur', label: 'یورو', symbol: '€' }
]

/**
 * Money is formatted once per rendered amount, so reading and parsing settings
 * out of `localStorage` on each call showed up as real jank on long lists.
 * Cache the resolved currency until something writes to storage.
 */
let cachedCurrency: { version: number; value: CurrencyUnit } | null = null

export function getCurrency(): CurrencyUnit {
  const version = getStorageVersion()

  if (cachedCurrency?.version === version) return cachedCurrency.value

  const settings = getSettings() ?? getDefaultSettings()

  const value = settings.currency ?? 'toman'

  cachedCurrency = { version, value }

  return value
}

export function getCurrencySymbol(currency?: CurrencyUnit): string {
  const unit = currency ?? getCurrency()

  return CURRENCY_OPTIONS.find(c => c.value === unit)?.symbol ?? 'تومان'
}

export function formatMoney(n: number, currency?: CurrencyUnit): string {
  const { number, symbol } = formatMoneyParts(n, currency)

  return `${number} ${symbol}`
}

export function formatMoneyParts(
  n: number,
  currency?: CurrencyUnit
): { number: string; symbol: string } {
  return {
    number: formatPersianNumber(n),
    symbol: getCurrencySymbol(currency)
  }
}

const numberFormatters = new Map<string, Intl.NumberFormat>()

/**
 * `Number.prototype.toLocaleString` builds a fresh `Intl.NumberFormat` on every
 * call, which is ~20x slower than reusing one. Keep one formatter per option set.
 */
function getNumberFormatter(options?: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = options ? JSON.stringify(options) : ''

  const cached = numberFormatters.get(key)

  if (cached) return cached

  const formatter = new Intl.NumberFormat('fa-IR', options)

  numberFormatters.set(key, formatter)

  return formatter
}

export function formatPersianNumber(n: number, options?: Intl.NumberFormatOptions): string {
  return getNumberFormatter(options).format(n)
}

/** Typographic minus (U+2212); `-` is a hyphen and renders shorter and looser. */
export const MINUS_SIGN = '−'

/** Left-to-right mark: keeps a leading sign glued to the digits inside RTL text. */
const LRM = '‎'

/**
 * A signed amount in one shape everywhere: `−۴٬۵۴۰٬۰۰۰` / `+۱۲۰٬۰۰۰`, sign attached
 * to the digits with no space. `showPlus` adds `+` for positive values.
 */
export function formatSignedNumber(n: number, options?: { showPlus?: boolean }): string {
  const number = formatPersianNumber(Math.abs(n))

  if (n < 0) return `${LRM}${MINUS_SIGN}${number}`
  if (n > 0 && options?.showPlus) return `${LRM}+${number}`

  return number
}

export function formatSignedMoney(
  n: number,
  options?: { showPlus?: boolean; currency?: CurrencyUnit }
): string {
  return `${formatSignedNumber(n, options)} ${getCurrencySymbol(options?.currency)}`
}

const COMPACT_UNITS: { value: number; suffix: string }[] = [
  { value: 1_000_000_000, suffix: 'میلیارد' },
  { value: 1_000_000, suffix: 'م' },
  { value: 1_000, suffix: 'ه' }
]

/**
 * Short Persian form for tight spots (chart axes, donut centers):
 * `۳٫۵ م` (million), `۱۲۰ ه` (thousand), `۱٫۲ میلیارد`.
 */
export function formatCompactNumber(n: number): string {
  const abs = Math.abs(n)
  const unit = COMPACT_UNITS.find(item => abs >= item.value)
  const scaled = unit ? abs / unit.value : abs
  const digits = formatPersianNumber(scaled, { maximumFractionDigits: scaled < 100 ? 1 : 0 })
  const text = unit ? `${digits} ${unit.suffix}` : digits

  return n < 0 ? `${LRM}${MINUS_SIGN}${text}` : text
}
