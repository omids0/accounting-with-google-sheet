export interface JalaliParts {
  year: number;
  month: number;
  day: number;
}

export interface DateRange {
  start: string;
  end: string;
}

export const JALALI_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getJalaliParts(d: Date): JalaliParts {
  const parts = new Intl.DateTimeFormat('en-u-ca-persian', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(d);

  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);

  return { year: get('year'), month: get('month'), day: get('day') };
}

export function findGregorianForJalali(jy: number, jm: number, jd: number): Date {
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

export function daysInJalaliMonth(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  for (let jd = 30; jd >= 29; jd--) {
    const d = findGregorianForJalali(jy, jm, jd);
    if (getJalaliParts(d).month === jm) return jd;
  }
  return 29;
}

export function isoToJalali(iso: string): JalaliParts {
  if (!iso) return getJalaliParts(new Date());
  return getJalaliParts(new Date(iso + 'T12:00:00'));
}

export function jalaliToIso(jy: number, jm: number, jd: number): string {
  return toIsoDate(findGregorianForJalali(jy, jm, jd));
}

export function getTodayIso(): string {
  return toIsoDate(new Date());
}

export function addDaysToIso(iso: string, days: number): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

export function formatIsoDatePersian(iso: string): string {
  if (!iso) return '—';
  const d = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return iso;
  return new Date(`${d}T12:00:00`).toLocaleDateString('fa-IR', {
    calendar: 'persian',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function addJalaliMonths(
  baseIso: string,
  monthsToAdd: number,
  day: number
): string {
  const { year, month } = isoToJalali(baseIso);
  let jm = month + monthsToAdd;
  let jy = year;
  while (jm > 12) {
    jm -= 12;
    jy += 1;
  }
  const maxDay = daysInJalaliMonth(jy, jm);
  return jalaliToIso(jy, jm, Math.min(day, maxDay));
}
