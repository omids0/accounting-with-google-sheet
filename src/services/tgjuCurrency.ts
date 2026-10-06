import { getCachedTgjuEurToman, getCachedTgjuPrices } from './tgju'
import type { CurrencyUnit, VaultAssetType } from '../types'
import { getCurrency } from '../utils/formatMoney'

export type TgjuPriceTable = Record<VaultAssetType, number>

export interface TgjuDisplayPrices {
  prices: TgjuPriceTable
  /** Currency the prices are expressed in — `toman` when the user's currency can't be reached. */
  currency: CurrencyUnit
}

function safePrice(value: number | undefined): number {
  return value != null && Number.isFinite(value) && value > 0 ? value : 0
}

function mapPrices(prices: TgjuPriceTable, fn: (toman: number) => number): TgjuPriceTable {
  const result = {} as TgjuPriceTable

  for (const asset of Object.keys(prices) as VaultAssetType[]) {
    const toman = safePrice(prices[asset])

    result[asset] = toman > 0 ? fn(toman) : 0
  }

  return result
}

/**
 * tgju asset prices are always in toman. Convert them to the user's display currency:
 * rial ×10, USD/EUR via tgju's own dollar/euro price. When that rate is missing, the
 * prices stay in toman and `currency` says so, so the UI can label them «تومان».
 */
export function convertTgjuPrices(
  tomanPrices: TgjuPriceTable,
  currency: CurrencyUnit,
  eurToman = 0
): TgjuDisplayPrices {
  if (currency === 'rial') {
    return { prices: mapPrices(tomanPrices, toman => toman * 10), currency }
  }

  const foreignRate =
    currency === 'usd' ? safePrice(tomanPrices.usd) : currency === 'eur' ? safePrice(eurToman) : 0

  if ((currency === 'usd' || currency === 'eur') && foreignRate > 0) {
    return { prices: mapPrices(tomanPrices, toman => toman / foreignRate), currency }
  }

  return { prices: mapPrices(tomanPrices, toman => toman), currency: 'toman' }
}

/** Cached tgju prices in the display currency, or null when not loaded. */
export function getDisplayTgjuPrices(
  tomanPrices: TgjuPriceTable | null = getCachedTgjuPrices(),
  currency: CurrencyUnit = getCurrency()
): TgjuDisplayPrices | null {
  if (!tomanPrices) return null

  return convertTgjuPrices(tomanPrices, currency, getCachedTgjuEurToman())
}

/**
 * Prices safe to add to the user's other balances: null when not loaded or when they
 * could not be converted into the display currency (never mix toman into a USD total).
 */
export function getSummableTgjuPrices(
  tomanPrices: TgjuPriceTable | null = getCachedTgjuPrices(),
  currency: CurrencyUnit = getCurrency()
): TgjuPriceTable | null {
  const display = getDisplayTgjuPrices(tomanPrices, currency)

  return display && display.currency === currency ? display.prices : null
}
