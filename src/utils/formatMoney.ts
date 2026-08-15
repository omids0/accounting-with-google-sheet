import type { CurrencyUnit } from '../types';
import { getSettings, getDefaultSettings } from '../services/settings';

export const CURRENCY_OPTIONS: { value: CurrencyUnit; label: string; symbol: string }[] = [
  { value: 'toman', label: 'تومان', symbol: 'تومان' },
  { value: 'rial', label: 'ریال', symbol: 'ریال' },
  { value: 'usd', label: 'دلار', symbol: '$' },
  { value: 'eur', label: 'یورو', symbol: '€' },
];

export function getCurrency(): CurrencyUnit {
  const settings = getSettings() ?? getDefaultSettings();
  return settings.currency ?? 'toman';
}

export function getCurrencySymbol(currency?: CurrencyUnit): string {
  const unit = currency ?? getCurrency();
  return CURRENCY_OPTIONS.find((c) => c.value === unit)?.symbol ?? 'تومان';
}

export function formatMoney(n: number, currency?: CurrencyUnit): string {
  const formatted = n.toLocaleString('fa-IR');
  return `${formatted} ${getCurrencySymbol(currency)}`;
}
