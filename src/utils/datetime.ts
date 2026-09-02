import { formatIsoDatePersian } from './jalaliDate';

export function toDateTimeIso(dateIso: string, hour: number, minute: number): string {
  const date = dateIso.slice(0, 10);
  const h = String(hour).padStart(2, '0');
  const m = String(minute).padStart(2, '0');
  return `${date}T${h}:${m}:00`;
}

export function fromDateTimeIso(iso: string): {
  dateIso: string;
  hour: number;
  minute: number;
} {
  if (!iso) {
    const now = new Date();
    return {
      dateIso: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
      hour: now.getHours(),
      minute: now.getMinutes(),
    };
  }

  const [datePart, timePart = '00:00:00'] = iso.split('T');
  const [hourRaw, minuteRaw] = timePart.split(':');
  return {
    dateIso: datePart,
    hour: Number(hourRaw) || 0,
    minute: Number(minuteRaw) || 0,
  };
}

export function parseDateTime(iso: string): Date {
  if (!iso) return new Date(NaN);
  if (iso.includes('T')) return new Date(iso);
  return new Date(`${iso.slice(0, 10)}T00:00:00`);
}

export function calcDurationMinutes(startAt: string, endAt: string): number {
  const start = parseDateTime(startAt);
  const end = parseDateTime(endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return 0;
  }
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

export function formatDurationFa(minutes: number): string {
  if (minutes <= 0) return '۰';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours.toLocaleString('fa-IR')} ساعت`);
  if (mins > 0) parts.push(`${mins.toLocaleString('fa-IR')} دقیقه`);
  return parts.join(' و ') || '۰';
}

/** Decimal hours as shown in Jira timesheets (e.g. 121.2 = 121h 12m). */
export function formatJiraTimesheetHours(minutes: number): string {
  if (minutes <= 0) return '0';
  return (minutes / 60).toFixed(1);
}

export function formatDateTimePersian(iso: string): string {
  if (!iso) return '—';
  const { dateIso, hour, minute } = fromDateTimeIso(iso);
  const dateLabel = formatIsoDatePersian(dateIso);
  const timeLabel = `${hour.toLocaleString('fa-IR', { useGrouping: false })}:${String(minute).padStart(2, '0')}`;
  return `${dateLabel}، ${timeLabel}`;
}

export function addMinutesToDateTime(iso: string, minutes: number): string {
  const date = parseDateTime(iso);
  if (Number.isNaN(date.getTime())) return iso;
  date.setMinutes(date.getMinutes() + minutes);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}:00`;
}

export function syncEndDateTimeFromStart(
  startAt: string,
  endAt: string,
  previousStartAt?: string
): string {
  if (!startAt) return endAt;
  if (!endAt) return addMinutesToDateTime(startAt, 60);

  const startDate = startAt.slice(0, 10);
  const oldStartDate = previousStartAt?.slice(0, 10);
  const endTime = endAt.split('T')[1] ?? '00:00:00';

  let nextEnd = endAt;
  const startDateChanged = Boolean(previousStartAt && startDate !== oldStartDate);
  const endWasAlignedToStart =
    !previousStartAt || !oldStartDate || endAt.slice(0, 10) === oldStartDate;

  if (startDateChanged || endWasAlignedToStart) {
    nextEnd = `${startDate}T${endTime}`;
  }

  if (parseDateTime(nextEnd) <= parseDateTime(startAt)) {
    nextEnd = addMinutesToDateTime(startAt, 60);
  }

  return clampDateTimeToMin(nextEnd, startAt);
}

export function clampDateTimeToMin(value: string, minDateTime: string): string {
  if (!minDateTime) return value;
  if (parseDateTime(value) < parseDateTime(minDateTime)) {
    return minDateTime;
  }
  return value;
}

export function getNowDateTimeIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}:00`;
}
