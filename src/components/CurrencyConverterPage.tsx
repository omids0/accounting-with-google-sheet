import { useCallback, useEffect, useMemo, useState } from 'react';
import AppIcon from './AppIcon';
import { FormField, FormSelect } from './form';
import {
  EXCHANGE_CURRENCY_OPTIONS,
  fetchTgjuExchangeRates,
  getExchangeCurrencyLabel,
  type ExchangeCurrencyCode,
  type ExchangeRateQuote,
} from '../services/tgju';
import {
  convertCurrencyAmount,
  formatCurrencyAmount,
  formatDecimalAmountInput,
  resolveCurrencyDisplay,
  roundCurrencyAmount,
} from '../utils/currencyConverter';
import { getCurrency } from '../utils/formatMoney';
import { numberToPersianWords } from '../utils/numberToWords';
import { showError } from '../utils/toast';

const CURRENCY_SELECT_OPTIONS = EXCHANGE_CURRENCY_OPTIONS.map((option) => ({
  value: option.code,
  label: option.label,
}));

function getDefaultToCurrency(): ExchangeCurrencyCode {
  return getCurrency() === 'toman' ? 'toman' : 'irr';
}

function parseDecimalInput(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[,\u060C\u066B\u066C\s]/g, '')
    .replace(/[^\d.]/g, '')
    .replace(/(\..*)\./g, '$1');
}

export default function CurrencyConverterPage() {
  const displayInToman = getCurrency() === 'toman';
  const displayOptions = useMemo(() => ({ displayInToman }), [displayInToman]);

  const [fromCurrency, setFromCurrency] = useState<ExchangeCurrencyCode>('usd');
  const [toCurrency, setToCurrency] = useState<ExchangeCurrencyCode>(getDefaultToCurrency);
  const [amount, setAmount] = useState('');
  const [rates, setRates] = useState<Record<ExchangeCurrencyCode, ExchangeRateQuote> | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const loadRates = useCallback(async () => {
    setLoading(true);
    try {
      const nextRates = await fetchTgjuExchangeRates();
      setRates(nextRates);

      const timestamps = Object.values(nextRates)
        .map((quote) => quote.updatedAt)
        .filter((value): value is string => Boolean(value));
      setLastUpdated(timestamps[0] ?? null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در دریافت نرخ ارز';
      showError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRates();
  }, [loadRates]);

  const amountValue = amount === '' ? 0 : Number(amount);
  const fromRate = rates?.[fromCurrency]?.rateInRial ?? 0;
  const toRate = rates?.[toCurrency]?.rateInRial ?? 0;

  const convertedAmount = useMemo(() => {
    if (!rates || amountValue <= 0) return 0;
    return convertCurrencyAmount(amountValue, fromRate, toRate);
  }, [amountValue, fromRate, toRate, rates]);

  const roundedConverted = roundCurrencyAmount(convertedAmount, toCurrency);
  const hasValidInput = amount !== '' && amountValue > 0 && fromRate > 0 && toRate > 0;

  const crossRate = fromRate > 0 && toRate > 0 ? fromRate / toRate : 0;
  const displayConverted = resolveCurrencyDisplay(
    roundedConverted,
    toCurrency,
    displayOptions
  );

  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  return (
    <div className="currency-converter-page">
      <div className="card currency-converter-form-card">
        <div className="currency-converter-header">
          <h3 className="card-title">تبدیل ارز</h3>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={loadRates}
            disabled={loading}
          >
            <AppIcon name="refresh" size={16} strokeWidth={2} />
            {loading ? 'در حال بروزرسانی...' : 'بروزرسانی نرخ'}
          </button>
        </div>

        <p className="currency-converter-hint">
          نرخ‌ها از tgju.org دریافت می‌شوند. مبلغ را در ارز مبدا وارد کنید تا معادل ارز
          مقصد نمایش داده شود.
        </p>

        <div className="currency-converter-select-row">
          <FormSelect
            label="ارز مبدا"
            value={fromCurrency}
            onChange={(value) => setFromCurrency(value as ExchangeCurrencyCode)}
            options={CURRENCY_SELECT_OPTIONS}
            aria-label="ارز مبدا"
          />

          <button
            type="button"
            className="currency-converter-swap-btn"
            onClick={handleSwap}
            aria-label="جابه‌جایی ارز مبدا و مقصد"
            title="جابه‌جایی"
          >
            <AppIcon name="swap" size={20} strokeWidth={2} />
          </button>

          <FormSelect
            label="ارز مقصد"
            value={toCurrency}
            onChange={(value) => setToCurrency(value as ExchangeCurrencyCode)}
            options={CURRENCY_SELECT_OPTIONS}
            aria-label="ارز مقصد"
          />
        </div>

        <FormField label={`مبلغ (${getExchangeCurrencyLabel(fromCurrency)})`} required>
          <input
            type="text"
            inputMode="decimal"
            value={formatDecimalAmountInput(amount)}
            onChange={(e) => setAmount(parseDecimalInput(e.target.value))}
            placeholder="مثلاً ۱۰۰"
            dir="ltr"
          />
        </FormField>

        {rates && crossRate > 0 && (
          <p className="currency-converter-rate-line" dir="ltr">
            ۱ {getExchangeCurrencyLabel(fromCurrency)} ={' '}
            {formatCurrencyAmount(crossRate, toCurrency, displayOptions)}
          </p>
        )}

        {lastUpdated && (
          <p className="currency-converter-updated-at">
            آخرین بروزرسانی نرخ: {lastUpdated}
          </p>
        )}
      </div>

      {hasValidInput ? (
        <div className="card dashboard-hero-card currency-converter-result-card">
          <div className="dashboard-hero-label">معادل {getExchangeCurrencyLabel(toCurrency)}</div>
          <div className="currency-converter-result-value" dir="ltr">
            {formatCurrencyAmount(roundedConverted, toCurrency, displayOptions)}
          </div>
          {(toCurrency === 'irr' || toCurrency === 'toman') && displayConverted.amount > 0 && (
            <p className="dashboard-hero-hint">
              {numberToPersianWords(Math.round(displayConverted.amount))}{' '}
              {displayConverted.symbol}
            </p>
          )}
        </div>
      ) : (
        <div className="card currency-converter-empty-card">
          <p className="empty-text">
            {loading && !rates
              ? 'در حال دریافت نرخ ارز...'
              : 'پس از وارد کردن مبلغ، نتیجه تبدیل اینجا نمایش داده می‌شود.'}
          </p>
        </div>
      )}
    </div>
  );
}
