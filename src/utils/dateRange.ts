import type { DateRange } from './jalaliDate';
import {
  daysInJalaliMonth,
  findGregorianForJalali,
  getJalaliParts,
  toIsoDate,
} from './jalaliDate';

export type { DateRange } from './jalaliDate';

export type DateRangePreset = 'month-to-date' | 'last-month' | 'year-to-date';

export const DATE_RANGE_PRESETS: { id: DateRangePreset; label: string }[] = [
  { id: 'month-to-date', label: 'این ماه' },
  { id: 'last-month', label: 'ماه گذشته' },
  { id: 'year-to-date', label: 'از اول سال' },
];

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

export function isDateInRange(dateStr: string, range: DateRange): boolean {
  if (!dateStr) return false;
  const d = dateStr.slice(0, 10);
  return d >= range.start && d <= range.end;
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
