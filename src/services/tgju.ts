import type { VaultAssetType } from '../types';

const TGJU_API = 'https://call5.tgju.org/ajax.json';
const TGJU_FETCH_TIMEOUT_MS = 4_000;
const TGJU_CACHE_TTL_MS = 5 * 60 * 1000;

const ASSET_TGJU_KEYS: Record<VaultAssetType, string> = {
  sekeb: 'sekeb',
  sekee: 'sekee',
  nim: 'nim',
  rob: 'rob',
  gerami: 'gerami',
  geram18: 'geram18',
  usd: 'price_dollar_rl',
};

export const VAULT_ASSET_OPTIONS: {
  value: VaultAssetType;
  label: string;
  unit: string;
  hint?: string;
}[] = [
  { value: 'sekeb', label: 'سکه بهار آزادی', unit: 'عدد' },
  { value: 'sekee', label: 'سکه امامی', unit: 'عدد' },
  { value: 'nim', label: 'نیم سکه', unit: 'عدد' },
  { value: 'rob', label: 'ربع سکه', unit: 'عدد' },
  { value: 'gerami', label: 'سکه گرمی', unit: 'عدد', hint: 'هر سکه حدود ۱ گرم طلا' },
  { value: 'geram18', label: 'طلای ۱۸ عیار', unit: 'گرم', hint: 'مقدار را به گرم وارد کنید' },
  { value: 'usd', label: 'دلار', unit: 'دلار' },
];

export function getAssetLabel(assetType: VaultAssetType): string {
  return VAULT_ASSET_OPTIONS.find((a) => a.value === assetType)?.label ?? assetType;
}

export function getAssetUnit(assetType: VaultAssetType): string {
  return VAULT_ASSET_OPTIONS.find((a) => a.value === assetType)?.unit ?? '';
}

function parseTgjuPrice(raw: string | undefined): number {
  if (!raw) return 0;
  const num = Number(String(raw).replace(/,/g, ''));
  return num / 10;
}

function parseTgjuRialRate(raw: string | undefined): number {
  if (!raw) return 0;
  return Number(String(raw).replace(/,/g, ''));
}

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
  | 'jpy';

export interface ExchangeCurrencyOption {
  code: ExchangeCurrencyCode;
  label: string;
  symbol: string;
  tgjuKey?: string;
  fixedRateInRial?: number;
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
  { code: 'jpy', label: 'ین ژاپن', symbol: '¥', tgjuKey: 'price_jpy' },
];

export interface ExchangeRateQuote {
  rateInRial: number;
  updatedAt?: string;
}

let pricesCache: Record<VaultAssetType, number> | null = null;
let pricesCacheAt = 0;
let exchangeRatesCache: Record<ExchangeCurrencyCode, ExchangeRateQuote> | null = null;
let exchangeRatesCacheAt = 0;
let pricesFetchInFlight: Promise<Record<VaultAssetType, number>> | null = null;
let exchangeRatesFetchInFlight: Promise<Record<ExchangeCurrencyCode, ExchangeRateQuote>> | null =
  null;

function isCacheFresh(cacheAt: number): boolean {
  return cacheAt > 0 && Date.now() - cacheAt < TGJU_CACHE_TTL_MS;
}

async function fetchTgjuCurrent(): Promise<Record<string, { p?: string; ts?: string; t?: string }>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TGJU_FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(TGJU_API, { signal: controller.signal });
    if (!res.ok) throw new Error('خطا در دریافت قیمت از tgju.org');

    const data = (await res.json()) as {
      current?: Record<string, { p?: string; ts?: string; t?: string }>;
    };
    return data.current ?? {};
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('دریافت قیمت از tgju.org بیش از حد طول کشید');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function getCachedTgjuPrices(): Record<VaultAssetType, number> | null {
  return pricesCache;
}

export function getCachedTgjuExchangeRates(): Record<ExchangeCurrencyCode, ExchangeRateQuote> | null {
  return exchangeRatesCache;
}

/** Refresh tgju prices in the background without blocking callers. */
export function prefetchTgjuPrices(): void {
  void fetchTgjuPrices().catch(() => undefined);
}

export function getExchangeCurrencyOption(
  code: ExchangeCurrencyCode
): ExchangeCurrencyOption | undefined {
  return EXCHANGE_CURRENCY_OPTIONS.find((option) => option.code === code);
}

export function getExchangeCurrencyLabel(code: ExchangeCurrencyCode): string {
  return getExchangeCurrencyOption(code)?.label ?? code;
}

export function getExchangeCurrencySymbol(code: ExchangeCurrencyCode): string {
  return getExchangeCurrencyOption(code)?.symbol ?? code;
}

export async function fetchTgjuExchangeRates(): Promise<
  Record<ExchangeCurrencyCode, ExchangeRateQuote>
> {
  if (isCacheFresh(exchangeRatesCacheAt) && exchangeRatesCache) {
    return exchangeRatesCache;
  }

  if (exchangeRatesFetchInFlight) {
    return exchangeRatesFetchInFlight;
  }

  exchangeRatesFetchInFlight = (async () => {
    const current = await fetchTgjuCurrent();

    const rates = {} as Record<ExchangeCurrencyCode, ExchangeRateQuote>;
    for (const option of EXCHANGE_CURRENCY_OPTIONS) {
      if (option.fixedRateInRial != null) {
        rates[option.code] = { rateInRial: option.fixedRateInRial };
        continue;
      }

      const entry = option.tgjuKey ? current[option.tgjuKey] : undefined;
      rates[option.code] = {
        rateInRial: parseTgjuRialRate(entry?.p),
        updatedAt: entry?.t ?? entry?.ts,
      };
    }

    exchangeRatesCache = rates;
    exchangeRatesCacheAt = Date.now();
    return rates;
  })();

  try {
    return await exchangeRatesFetchInFlight;
  } finally {
    exchangeRatesFetchInFlight = null;
  }
}

export async function fetchTgjuPrices(): Promise<Record<VaultAssetType, number>> {
  if (isCacheFresh(pricesCacheAt) && pricesCache) {
    return pricesCache;
  }

  if (pricesFetchInFlight) {
    return pricesFetchInFlight;
  }

  pricesFetchInFlight = (async () => {
    const current = await fetchTgjuCurrent();

    const prices = {} as Record<VaultAssetType, number>;
    for (const [asset, key] of Object.entries(ASSET_TGJU_KEYS) as [VaultAssetType, string][]) {
      prices[asset] = parseTgjuPrice(current[key]?.p);
    }

    pricesCache = prices;
    pricesCacheAt = Date.now();
    return prices;
  })();

  try {
    return await pricesFetchInFlight;
  } finally {
    pricesFetchInFlight = null;
  }
}
