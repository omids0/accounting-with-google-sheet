export type DateRangePreset = 'month-to-date' | 'last-month' | 'year-to-date';

export interface DateRange {
  start: string;
  end: string;
}

export const DATE_RANGE_PRESETS: { id: DateRangePreset; label: string }[] = [
  { id: 'month-to-date', label: 'این ماه' },
  { id: 'last-month', label: 'ماه گذشته' },
  { id: 'year-to-date', label: 'از اول سال' },
];

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getJalaliParts(d: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-u-ca-persian', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(d);

  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);

  return { year: get('year'), month: get('month'), day: get('day') };
}

function findGregorianForJalali(jy: number, jm: number, jd: number): Date {
  const approx = jy + 621;
  for (let y = approx - 1; y <= approx + 1; y++) {
    for (let m = 0; m < 12; m++) {
      for (let day = 1; day <= 31; day++) {
        const d = new Date(y, m, day);
        const p = getJalaliParts(d);
        if (p.year === jy && p.month === jm && p.day === jd) return d;
      }
    }
  }
  return new Date();
}

function daysInJalaliMonth(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  for (let jd = 30; jd >= 29; jd--) {
    const d = findGregorianForJalali(jy, jm, jd);
    if (getJalaliParts(d).month === jm) return jd;
  }
  return 29;
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
