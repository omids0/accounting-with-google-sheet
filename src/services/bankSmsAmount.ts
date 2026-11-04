import type { CurrencyUnit, SmsAmountUnit } from '../types'

/**
 * The largest amount (or balance) an SMS may carry, in toman. A product number, not a technical
 * limit: a text above it is treated as spoofed or garbled and is never offered for saving. The owner
 * may change it. Building charges (hundreds of millions of toman) are far below it.
 */
export const MAX_SMS_AMOUNT_TOMAN = 1_000_000_000_000

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

/** `MAX_SMS_AMOUNT_TOMAN` in the app currency. */
export function maxSmsAmount(appCurrency: CurrencyUnit): number {
  return appCurrency === 'rial' ? MAX_SMS_AMOUNT_TOMAN * 10 : MAX_SMS_AMOUNT_TOMAN
}

/** A finite amount above 0 (the shape every writable SMS amount has). */
export function isPositiveFinite(value: number | null): boolean {
  return value !== null && Number.isFinite(value) && value > 0
}

/** An SMS amount (already in the app currency) that can be written: finite, above 0, within the cap. */
export function usableSmsAmount(value: number | null, appCurrency: CurrencyUnit): number | null {
  if (value === null || !Number.isFinite(value) || value <= 0) return null

  return value > maxSmsAmount(appCurrency) ? null : value
}

/** An SMS «مانده» (app currency) that may set a balance; `null` = drop it, it must never overwrite a wallet. */
export function usableSmsBalance(value: number | null, appCurrency: CurrencyUnit): number | null {
  if (value === null || !Number.isFinite(value)) return null

  return Math.abs(value) > maxSmsAmount(appCurrency) ? null : value
}
