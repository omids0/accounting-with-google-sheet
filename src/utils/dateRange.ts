import type { DateRange } from './jalaliDate';
import {
  daysInJalaliMonth,
  findGregorianForJalali,
  getJalaliParts,
  JALALI_MONTHS,
  toIsoDate,
} from './jalaliDate';
import { normalizeSheetDate } from './sheetValues';

export type { DateRange } from './jalaliDate';

export type DateRangePreset = 'month-to-date' | 'last-month' | 'year-to-date';
export type RecordsDatePreset = DateRangePreset | 'custom';

export const DATE_RANGE_PRESETS: { id: DateRangePreset; label: string }[] = [
  { id: 'month-to-date', label: 'این ماه' },
  { id: 'last-month', label: 'ماه گذشته' },
  { id: 'year-to-date', label: 'از اول سال' },
];

export const RECORDS_DATE_RANGE_PRESETS: { id: RecordsDatePreset; label: string }[] = [
  ...DATE_RANGE_PRESETS,
  { id: 'custom', label: 'بازه زمانی' },
];

export function resolveDateRange(
  preset: RecordsDatePreset,
  customRange?: DateRange
): DateRange {
  if (preset === 'custom' && customRange) return customRange;
  if (preset === 'custom') return getDateRange('month-to-date');
  return getDateRange(preset);
}

export function getJalaliYearRange(year: number): DateRange {
  const today = new Date();
  const { year: currentYear } = getJalaliParts(today);
  const start = findGregorianForJalali(year, 1, 1);

  if (year > currentYear) {
    return { start: toIsoDate(start), end: toIsoDate(start) };
  }

  if (year < currentYear) {
    const lastDay = daysInJalaliMonth(year, 12);
    const end = findGregorianForJalali(year, 12, lastDay);
    return { start: toIsoDate(start), end: toIsoDate(end) };
  }

  return { start: toIsoDate(start), end: toIsoDate(today) };
}

export function formatJalaliYear(year: number): string {
  return year.toLocaleString('fa-IR', { useGrouping: false });
}

export function getDateRange(preset: DateRangePreset): DateRange {
  const today = new Date();
  const { year: jy, month: jm } = getJalaliParts(today);

  switch (preset) {
    case 'month-to-date': {
      const start = findGregorianForJalali(jy, jm, 1);
      return { start: toIsoDate(start), end: toIsoDate(today) };
    }
    case 'last-month': {
      const prevJm = jm === 1 ? 12 : jm - 1;
      const prevJy = jm === 1 ? jy - 1 : jy;
      const start = findGregorianForJalali(prevJy, prevJm, 1);
      const lastDay = daysInJalaliMonth(prevJy, prevJm);
      const end = findGregorianForJalali(prevJy, prevJm, lastDay);
      return { start: toIsoDate(start), end: toIsoDate(end) };
    }
    case 'year-to-date': {
      const start = findGregorianForJalali(jy, 1, 1);
      return { start: toIsoDate(start), end: toIsoDate(today) };
    }
  }
}

/** Full calendar month(s) for matching installment due dates (not capped at today). */
export function getInstallmentDueRange(preset: DateRangePreset): DateRange {
  const today = new Date();
  const { year: jy, month: jm } = getJalaliParts(today);

  switch (preset) {
    case 'month-to-date': {
      const start = findGregorianForJalali(jy, jm, 1);
      const lastDay = daysInJalaliMonth(jy, jm);
      const end = findGregorianForJalali(jy, jm, lastDay);
      return { start: toIsoDate(start), end: toIsoDate(end) };
    }
    case 'last-month': {
      return getDateRange('last-month');
    }
    case 'year-to-date': {
      const start = findGregorianForJalali(jy, 1, 1);
      const lastDay = daysInJalaliMonth(jy, jm);
      const end = findGregorianForJalali(jy, jm, lastDay);
      return { start: toIsoDate(start), end: toIsoDate(end) };
    }
  }
}

export function isDateInRange(dateStr: string, range: DateRange): boolean {
  const d = normalizeSheetDate(dateStr);
  if (!d) return false;
  return d >= range.start && d <= range.end;
}

export function getJalaliMonthKey(isoDate: string): string {
  const { year, month } = getJalaliParts(new Date(isoDate + 'T12:00:00'));
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function formatJalaliMonthLabel(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!month || month < 1 || month > 12) return monthKey;
  return `${JALALI_MONTHS[month - 1]} ${year}`;
}

export function formatDateRangeLabel(range: DateRange): string {
  const fmt = (iso: string) =>
    new Date(iso + 'T12:00:00').toLocaleDateString('fa-IR', {
      calendar: 'persian',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  return `${fmt(range.start)} تا ${fmt(range.end)}`;
}
