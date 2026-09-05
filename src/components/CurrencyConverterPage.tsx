import { useCallback, useEffect, useMemo, useState } from 'react'

import AppIcon from './AppIcon'
import { FormField, FormSelect } from './form'
import Button from './ui/Button'
import {
  currencyConverterEmptyCardClass,
  currencyConverterFormCardClass,
  currencyConverterHeaderBtnClass,
  currencyConverterHeaderClass,
  currencyConverterHintClass,
  currencyConverterPageClass,
  currencyConverterRateLineClass,
  currencyConverterResultCardClass,
  currencyConverterResultValueClass,
  currencyConverterSelectRowClass,
  currencyConverterSwapBtnClass,
  currencyConverterUpdatedAtClass
} from './ui/calculatorStyles'
import Card, { CardTitle } from './ui/Card'
import {
  dashboardHeroCardClass,
  dashboardHeroHintClass,
  dashboardHeroLabelClass
} from './ui/chartStyles'
import { emptyTextClass } from './ui/displayStyles'
import {
  EXCHANGE_CURRENCY_OPTIONS,
  fetchTgjuExchangeRates,
  getExchangeCurrencyLabel,
  type ExchangeCurrencyCode,
  type ExchangeRateQuote
} from '../services/tgju'
import { cn } from '../utils/cn'
import {
  convertCurrencyAmount,
  formatCurrencyAmount,
  formatDecimalAmountInput,
  resolveCurrencyDisplay,
  roundCurrencyAmount
} from '../utils/currencyConverter'
import { getCurrency } from '../utils/formatMoney'
import { normalizeDigits } from '../utils/normalizeDigits'
import { numberToPersianWords } from '../utils/numberToWords'
import { showError } from '../utils/toast'

const CURRENCY_SELECT_OPTIONS = EXCHANGE_CURRENCY_OPTIONS.map(option => ({
  value: option.code,
  label: option.label
}))

function getDefaultToCurrency(): ExchangeCurrencyCode {
  return getCurrency() === 'toman' ? 'toman' : 'irr'
}

function parseDecimalInput(value: string): string {
  return normalizeDigits(value)
    .replace(/[,\u060C\u066B\u066C\s]/g, '')
    .replace(/[^\d.]/g, '')
    .replace(/(\..*)\./g, '$1')
}

export default function CurrencyConverterPage() {
  const displayInToman = getCurrency() === 'toman'

  const displayOptions = useMemo(() => ({ displayInToman }), [displayInToman])

  const [fromCurrency, setFromCurrency] = useState<ExchangeCurrencyCode>('usd')

  const [toCurrency, setToCurrency] = useState<ExchangeCurrencyCode>(getDefaultToCurrency)

  const [amount, setAmount] = useState('')

  const [rates, setRates] = useState<Record<ExchangeCurrencyCode, ExchangeRateQuote> | null>(null)

  const [loading, setLoading] = useState(false)

  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const loadRates = useCallback(async () => {
    setLoading(true)
    try {
      const nextRates = await fetchTgjuExchangeRates()

      setRates(nextRates)

      const timestamps = Object.values(nextRates)
        .map(quote => quote.updatedAt)
        .filter((value): value is string => Boolean(value))

      setLastUpdated(timestamps[0] ?? null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در دریافت نرخ ارز'

      showError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRates()
  }, [loadRates])

  const amountValue = amount === '' ? 0 : Number(amount)

  const fromRate = rates?.[fromCurrency]?.rateInRial ?? 0

  const toRate = rates?.[toCurrency]?.rateInRial ?? 0

  const convertedAmount = useMemo(() => {
    if (!rates || amountValue <= 0) return 0

    return convertCurrencyAmount(amountValue, fromRate, toRate)
  }, [amountValue, fromRate, toRate, rates])

  const roundedConverted = roundCurrencyAmount(convertedAmount, toCurrency)

  const hasValidInput = amount !== '' && amountValue > 0 && fromRate > 0 && toRate > 0

  const crossRate = fromRate > 0 && toRate > 0 ? fromRate / toRate : 0

  const displayConverted = resolveCurrencyDisplay(roundedConverted, toCurrency, displayOptions)

  const handleSwap = () => {
    setFromCurrency(toCurrency)
    setToCurrency(fromCurrency)
  }

  return (
    <div className={currencyConverterPageClass}>
      <Card className={currencyConverterFormCardClass}>
        <div className={currencyConverterHeaderClass}>
          <CardTitle>تبدیل ارز</CardTitle>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className={currencyConverterHeaderBtnClass}
            onClick={loadRates}
            disabled={loading}
          >
            <AppIcon name="refresh" size={16} strokeWidth={2} />
            {loading ? 'در حال بروزرسانی...' : 'بروزرسانی نرخ'}
          </Button>
        </div>

        <p className={currencyConverterHintClass}>
          نرخ‌ها از tgju.org دریافت می‌شوند. مبلغ را در ارز مبدا وارد کنید تا معادل ارز مقصد نمایش
          داده شود.
        </p>

        <div className={currencyConverterSelectRowClass}>
          <FormSelect
            label="ارز مبدا"
            value={fromCurrency}
            onChange={value => setFromCurrency(value as ExchangeCurrencyCode)}
            options={CURRENCY_SELECT_OPTIONS}
            aria-label="ارز مبدا"
          />

          <button
            type="button"
            className={currencyConverterSwapBtnClass}
            onClick={handleSwap}
            aria-label="جابه‌جایی ارز مبدا و مقصد"
            title="جابه‌جایی"
          >
            <AppIcon name="swap" size={20} strokeWidth={2} />
          </button>

          <FormSelect
            label="ارز مقصد"
            value={toCurrency}
            onChange={value => setToCurrency(value as ExchangeCurrencyCode)}
            options={CURRENCY_SELECT_OPTIONS}
            aria-label="ارز مقصد"
          />
        </div>

        <FormField label={`مبلغ (${getExchangeCurrencyLabel(fromCurrency)})`} required>
          <input
            type="text"
            inputMode="decimal"
            value={formatDecimalAmountInput(amount)}
            onChange={e => setAmount(parseDecimalInput(e.target.value))}
            placeholder="مثلاً ۱۰۰"
            dir="ltr"
          />
        </FormField>

        {rates && crossRate > 0 && (
          <p className={currencyConverterRateLineClass} dir="ltr">
            ۱ {getExchangeCurrencyLabel(fromCurrency)} ={' '}
            {formatCurrencyAmount(crossRate, toCurrency, displayOptions)}
          </p>
        )}

        {lastUpdated && (
          <p className={currencyConverterUpdatedAtClass}>آخرین بروزرسانی نرخ: {lastUpdated}</p>
        )}
      </Card>

      {hasValidInput ? (
        <Card className={cn(dashboardHeroCardClass, currencyConverterResultCardClass)}>
          <div className={dashboardHeroLabelClass}>
            معادل {getExchangeCurrencyLabel(toCurrency)}
          </div>
          <div className={currencyConverterResultValueClass} dir="ltr">
            {formatCurrencyAmount(roundedConverted, toCurrency, displayOptions)}
          </div>
          {(toCurrency === 'irr' || toCurrency === 'toman') && displayConverted.amount > 0 && (
            <p className={dashboardHeroHintClass}>
              {numberToPersianWords(Math.round(displayConverted.amount))} {displayConverted.symbol}
            </p>
          )}
        </Card>
      ) : (
        <Card className={currencyConverterEmptyCardClass}>
          <p className={emptyTextClass}>
            {loading && !rates
              ? 'در حال دریافت نرخ ارز...'
              : 'پس از وارد کردن مبلغ، نتیجه تبدیل اینجا نمایش داده می‌شود.'}
          </p>
        </Card>
      )}
    </div>
  )
}
