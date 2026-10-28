import { parseNumericStrict } from '../utils/parseNumeric'

const TGJU_API = 'https://call5.tgju.org/ajax.json'

const TGJU_FETCH_TIMEOUT_MS = 4_000

const TGJU_CACHE_TTL_MS = 5 * 60 * 1000

/** After a failed quotes fetch tgju is left alone this long; it doubles per repeated failure. */
const TGJU_COOLDOWN_BASE_MS = 60_000

const TGJU_COOLDOWN_MAX_MS = 5 * 60 * 1000

/** The one message for any failed price lookup: not an offline-sync text, and no raw network error. */
export const TGJU_PRICE_FAILED_MESSAGE =
  'قیمت لحظه‌ای دریافت نشد؛ ارزش دارایی‌های بدون قیمت دستی حساب نشده'

export class TgjuPriceError extends Error {
  constructor() {
    super(TGJU_PRICE_FAILED_MESSAGE)
    this.name = 'TgjuPriceError'
  }
}

/** tgju quotes rial; non-numeric or non-positive values read as 0 (unavailable), never NaN. */
function parseTgjuRialRate(raw: string | undefined): number {
  const rial = parseNumericStrict(raw)

  return rial != null && rial > 0 ? rial : 0
}

/** Asset prices are kept in toman (rial ÷ 10). */
function parseTgjuPrice(raw: string | undefined): number {
  return parseTgjuRialRate(raw) / 10
}

const TGJU_EUR_KEY = 'price_eur'

let eurTomanCache = 0

export type ExchangeCurrencyCode =
  | 'irr'
  | 'toman'
  | 'usd'
  | 'eur'
  | 'gbp'
  | 'aed'
  | 'try'
  | 'cny'
  | 'chf'
  | 'cad'
  | 'aud'
  | 'sar'
  | 'kwd'
  | 'rub'
  | 'jpy'

export interface ExchangeCurrencyOption {
  code: ExchangeCurrencyCode
  label: string
  symbol: string
  tgjuKey?: string
  fixedRateInRial?: number
}

export const EXCHANGE_CURRENCY_OPTIONS: ExchangeCurrencyOption[] = [
  { code: 'usd', label: 'دلار آمریکا', symbol: '$', tgjuKey: 'price_dollar_rl' },
  { code: 'irr', label: 'ریال ایران', symbol: 'ریال', fixedRateInRial: 1 },
  { code: 'toman', label: 'تومان ایران', symbol: 'تومان', fixedRateInRial: 10 },
  { code: 'eur', label: 'یورو', symbol: '€', tgjuKey: 'price_eur' },
  { code: 'gbp', label: 'پوند انگلیس', symbol: '£', tgjuKey: 'price_gbp' },
  { code: 'aed', label: 'درهم امارات', symbol: 'AED', tgjuKey: 'price_aed' },
  { code: 'try', label: 'لیر ترکیه', symbol: '₺', tgjuKey: 'price_try' },
  { code: 'cny', label: 'یوان چین', symbol: '¥', tgjuKey: 'price_cny' },
  { code: 'chf', label: 'فرانک سوئیس', symbol: 'CHF', tgjuKey: 'price_chf' },
  { code: 'cad', label: 'دلار کانادا', symbol: 'C$', tgjuKey: 'price_cad' },
  { code: 'aud', label: 'دلار استرالیا', symbol: 'A$', tgjuKey: 'price_aud' },
  { code: 'sar', label: 'ریال عربستان', symbol: 'SAR', tgjuKey: 'price_sar' },
  { code: 'kwd', label: 'دینار کویت', symbol: 'KWD', tgjuKey: 'price_kwd' },
  { code: 'rub', label: 'روبل روسیه', symbol: '₽', tgjuKey: 'price_rub' },
  { code: 'jpy', label: 'ین ژاپن', symbol: '¥', tgjuKey: 'price_jpy' }
]

export interface ExchangeRateQuote {
  rateInRial: number
  updatedAt?: string
}

/** tgju's raw `current` map from the last asset-price fetch. */
let quotesCache: TgjuCurrent | null = null

let quotesCacheAt = 0

let exchangeRatesCache: Record<ExchangeCurrencyCode, ExchangeRateQuote> | null = null

let exchangeRatesCacheAt = 0

let quotesFetchInFlight: Promise<TgjuCurrent> | null = null

let quotesFailures = 0

let quotesFailedAt = 0

/** True while a recent failure keeps the quotes fetch from touching the network (see `force`). */
export function isTgjuCoolingDown(): boolean {
  if (quotesFailures === 0) return false

  const wait = Math.min(TGJU_COOLDOWN_MAX_MS, TGJU_COOLDOWN_BASE_MS * 2 ** (quotesFailures - 1))

  return Date.now() - quotesFailedAt < wait
}

let exchangeRatesFetchInFlight: Promise<Record<ExchangeCurrencyCode, ExchangeRateQuote>> | null =
  null

function isCacheFresh(cacheAt: number): boolean {
  return cacheAt > 0 && Date.now() - cacheAt < TGJU_CACHE_TTL_MS
}

type TgjuCurrent = Record<string, { p?: string; ts?: string; t?: string }>

async function fetchTgjuCurrent(): Promise<TgjuCurrent> {
  const controller = new AbortController()

  const timeoutId = setTimeout(() => controller.abort(), TGJU_FETCH_TIMEOUT_MS)

  try {
    const res = await fetch(TGJU_API, { signal: controller.signal })

    if (!res.ok) throw new Error('خطا در دریافت قیمت از tgju.org')

    const data = (await res.json()) as { current?: TgjuCurrent }

    return data.current ?? {}
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('دریافت قیمت از tgju.org بیش از حد طول کشید')
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

/** asset id → toman price for each tgju key (0 when tgju has no usable quote). */
function pricesFromQuotes(
  current: TgjuCurrent,
  keys: Record<string, string>
): Record<string, number> {
  const prices: Record<string, number> = {}

  for (const [asset, key] of Object.entries(keys)) {
    prices[asset] = parseTgjuPrice(current[key]?.p)
  }

  return prices
}

/** Cached tgju asset prices (toman) for the given asset → tgju key map, or null. */
export function getCachedTgjuPrices(keys: Record<string, string>): Record<string, number> | null {
  return quotesCache ? pricesFromQuotes(quotesCache, keys) : null
}

/** Toman per euro from the last tgju fetch (0 when unknown). */
export function getCachedTgjuEurToman(): number {
  return eurTomanCache || (exchangeRatesCache?.eur?.rateInRial ?? 0) / 10
}

export function getCachedTgjuExchangeRates(): Record<
  ExchangeCurrencyCode,
  ExchangeRateQuote
> | null {
  return exchangeRatesCache
}

export function getExchangeCurrencyOption(
  code: ExchangeCurrencyCode
): ExchangeCurrencyOption | undefined {
  return EXCHANGE_CURRENCY_OPTIONS.find(option => option.code === code)
}

export function getExchangeCurrencyLabel(code: ExchangeCurrencyCode): string {
  return getExchangeCurrencyOption(code)?.label ?? code
}

export function getExchangeCurrencySymbol(code: ExchangeCurrencyCode): string {
  return getExchangeCurrencyOption(code)?.symbol ?? code
}

export async function fetchTgjuExchangeRates(): Promise<
  Record<ExchangeCurrencyCode, ExchangeRateQuote>
> {
  if (isCacheFresh(exchangeRatesCacheAt) && exchangeRatesCache) {
    return exchangeRatesCache
  }

  if (exchangeRatesFetchInFlight) {
    return exchangeRatesFetchInFlight
  }

  exchangeRatesFetchInFlight = (async () => {
    const current = await fetchTgjuCurrent()

    const rates = {} as Record<ExchangeCurrencyCode, ExchangeRateQuote>

    for (const option of EXCHANGE_CURRENCY_OPTIONS) {
      if (option.fixedRateInRial != null) {
        rates[option.code] = { rateInRial: option.fixedRateInRial }
        continue
      }

      const entry = option.tgjuKey ? current[option.tgjuKey] : undefined

      rates[option.code] = {
        rateInRial: parseTgjuRialRate(entry?.p),
        updatedAt: entry?.t ?? entry?.ts
      }
    }

    exchangeRatesCache = rates
    exchangeRatesCacheAt = Date.now()

    return rates
  })()

  try {
    return await exchangeRatesFetchInFlight
  } finally {
    exchangeRatesFetchInFlight = null
  }
}

async function fetchTgjuQuotes(force: boolean): Promise<TgjuCurrent> {
  if (isCacheFresh(quotesCacheAt) && quotesCache) return quotesCache

  if (quotesFetchInFlight) return quotesFetchInFlight

  // Cooling down after a failure: serve the last quotes (stale) or fail without a request.
  if (!force && isTgjuCoolingDown()) {
    if (quotesCache) return quotesCache

    throw new TgjuPriceError()
  }

  quotesFetchInFlight = (async () => {
    let current: TgjuCurrent

    try {
      current = await fetchTgjuCurrent()
    } catch {
      quotesFailures += 1
      quotesFailedAt = Date.now()

      throw new TgjuPriceError()
    }

    quotesFailures = 0
    eurTomanCache = parseTgjuPrice(current[TGJU_EUR_KEY]?.p)
    quotesCache = current
    quotesCacheAt = Date.now()

    return current
  })()

  try {
    return await quotesFetchInFlight
  } finally {
    quotesFetchInFlight = null
  }
}

/**
 * Toman prices for every catalog asset priced by tgju (`keys`: asset id → tgju key). A failure
 * (rejected, timed out, not OK) throws `TgjuPriceError` and starts a cooldown with no further
 * requests; `force` (the user's own refresh) ignores the cooldown, and a success ends it.
 */
export async function fetchTgjuPrices(
  keys: Record<string, string>,
  { force = false }: { force?: boolean } = {}
): Promise<Record<string, number>> {
  return pricesFromQuotes(await fetchTgjuQuotes(force), keys)
}

/** Tests only: forget quotes and failures. */
export function resetTgjuQuotesState(): void {
  quotesCache = null
  quotesCacheAt = 0
  quotesFailures = 0
  quotesFailedAt = 0
  quotesFetchInFlight = null
}
