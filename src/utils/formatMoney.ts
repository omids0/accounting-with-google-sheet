import { getSettings, getDefaultSettings } from '../services/settings'
import type { CurrencyUnit } from '../types'

export const CURRENCY_OPTIONS: { value: CurrencyUnit; label: string; symbol: string }[] = [
  { value: 'toman', label: 'تومان', symbol: 'تومان' },
  { value: 'rial', label: 'ریال', symbol: 'ریال' },
  { value: 'usd', label: 'دلار', symbol: '$' },
  { value: 'eur', label: 'یورو', symbol: '€' }
]

export function getCurrency(): CurrencyUnit {
  const settings = getSettings() ?? getDefaultSettings()

  return settings.currency ?? 'toman'
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

export function formatPersianNumber(n: number, options?: Intl.NumberFormatOptions): string {
  return n.toLocaleString('fa-IR', options)
}
