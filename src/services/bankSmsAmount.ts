import type { CurrencyUnit, SmsAmountUnit } from '../types'

/**
 * Convert an SMS amount into the app's currency unit.
 * `null` = the app runs in usd/eur, where bank SMS amounts cannot be used.
 */
export function toAppCurrency(
  value: number,
  unit: SmsAmountUnit,
  appCurrency: CurrencyUnit
): number | null {
  if (appCurrency !== 'rial' && appCurrency !== 'toman') return null
  if (unit === appCurrency) return value

  return unit === 'rial' ? value / 10 : value * 10
}
