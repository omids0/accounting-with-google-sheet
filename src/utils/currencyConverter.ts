import type { ExchangeCurrencyCode } from '../services/tgju'
import { getExchangeCurrencySymbol } from '../services/tgju'

export interface CurrencyDisplayOptions {
  displayInToman?: boolean
}

export function resolveCurrencyDisplay(
  amount: number,
  code: ExchangeCurrencyCode,
  options: CurrencyDisplayOptions = {}
): { amount: number; symbol: string; decimalsCode: ExchangeCurrencyCode } {
  if (options.displayInToman && code === 'irr') {
    return {
      amount: amount / 10,
      symbol: 'تومان',
      decimalsCode: 'toman'
    }
  }

  return {
    amount,
    symbol: getExchangeCurrencySymbol(code),
    decimalsCode: code
  }
}

export function convertCurrencyAmount(
  amount: number,
  fromRateInRial: number,
  toRateInRial: number
): number {
  if (amount <= 0 || fromRateInRial <= 0 || toRateInRial <= 0) return 0

  return (amount * fromRateInRial) / toRateInRial
}

export function getCurrencyDecimalPlaces(code: ExchangeCurrencyCode): number {
  return code === 'irr' || code === 'toman' ? 0 : 2
}

export function roundCurrencyAmount(amount: number, code: ExchangeCurrencyCode): number {
  const decimals = getCurrencyDecimalPlaces(code)

  if (decimals === 0) return Math.round(amount)

  const factor = 10 ** decimals

  return Math.round(amount * factor) / factor
}

export function formatCurrencyAmount(
  amount: number,
  code: ExchangeCurrencyCode,
  options: CurrencyDisplayOptions = {}
): string {
  const {
    amount: displayAmount,
    symbol,
    decimalsCode
  } = resolveCurrencyDisplay(amount, code, options)

  const rounded = roundCurrencyAmount(displayAmount, decimalsCode)

  const decimals = getCurrencyDecimalPlaces(decimalsCode)

  const number = rounded.toLocaleString('fa-IR', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: 0
  })

  return `${number} ${symbol}`
}

export function formatDecimalAmountInput(raw: string): string {
  if (!raw) return ''

  const parts = raw.split('.')

  const intPart = parts[0] ?? ''

  const decPart = parts[1]

  const formattedInt = intPart ? Number(intPart).toLocaleString('fa-IR') : ''

  if (!raw.includes('.')) return formattedInt
  if (decPart === undefined) return `${formattedInt}.`

  return `${formattedInt}.${decPart}`
}
