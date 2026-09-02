import { useEffect, useMemo, useState } from 'react';
import {
  daysInCalendarMonth,
  getCalendarMonthWheelItems,
  getCalendarParts,
  getCalendarYearRange,
  partsToIso,
  type CalendarSystem,
} from '../utils/dateConverter';
import {
  clampDateTimeToMin,
  formatDateTimePersian,
  fromDateTimeIso,
  getNowDateTimeIso,
  toDateTimeIso,
} from '../utils/datetime';
import WheelPicker from './form/WheelPicker';

interface JalaliDateTimePickerProps {
  value: string;
  onChange: (iso: string) => void;
  calendar?: CalendarSystem;
  minDateTime?: string;
  label?: string;
}

function fa(n: number): string {
  return n.toLocaleString('fa-IR', { useGrouping: false });
}

interface DateTimeWheelFieldsProps {
  calendar: CalendarSystem;
  value: string;
  onChange: (iso: string) => void;
  minDateTime?: string;
}

function DateTimeWheelFields({
  calendar,
  value,
  onChange,
  minDateTime,
}: DateTimeWheelFieldsProps) {
  const { dateIso, hour, minute } = fromDateTimeIso(value);
  const { year, month, day } = getCalendarParts(dateIso, calendar);
  const years = useMemo(() => getCalendarYearRange(calendar, dateIso), [calendar, dateIso]);
  const monthItems = useMemo(() => getCalendarMonthWheelItems(calendar), [calendar]);
  const maxDay = daysInCalendarMonth(year, month, calendar);
  const safeDay = Math.min(day, maxDay);

  const yearItems = useMemo(
    () =>
      years.map((itemYear) => ({
        value: String(itemYear),
        label: fa(itemYear),
      })),
    [years]
  );

  const dayItems = useMemo(() => {
    const dayCount = daysInCalendarMonth(year, month, calendar);
    return Array.from({ length: dayCount }, (_, index) => {
      const itemDay = index + 1;
      return { value: String(itemDay), label: fa(itemDay) };
    });
  }, [year, month, calendar]);

  const hourItems = useMemo(
    () =>
      Array.from({ length: 24 }, (_, index) => ({
        value: String(index),
        label: fa(index),
      })),
    []
  );

  const minuteItems = useMemo(
    () =>
      Array.from({ length: 60 }, (_, index) => ({
        value: String(index),
        label: String(index).padStart(2, '0'),
      })),
    []
  );

  const applyChange = (
    nextYear: number,
    nextMonth: number,
    nextDay: number,
    nextHour: number,
    nextMinute: number
  ) => {
    const max = daysInCalendarMonth(nextYear, nextMonth, calendar);
    const nextDateIso = partsToIso(
      { year: nextYear, month: nextMonth, day: Math.min(nextDay, max) },
      calendar
    );
    const nextValue = toDateTimeIso(nextDateIso, nextHour, nextMinute);
    onChange(minDateTime ? clampDateTimeToMin(nextValue, minDateTime) : nextValue);
  };

  return (
    <div className="jalali-date-picker jalali-datetime-picker">
      <div className="jalali-date-picker-column">
        <span className="jalali-date-picker-label">سال</span>
        <WheelPicker
          value={String(year)}
          onChange={(next) => applyChange(Number(next), month, safeDay, hour, minute)}
          aria-label="سال"
          items={yearItems}
        />
      </div>
      <div className="jalali-date-picker-column jalali-date-picker-column--month">
        <span className="jalali-date-picker-label">ماه</span>
        <WheelPicker
          value={String(month)}
          onChange={(next) => applyChange(year, Number(next), safeDay, hour, minute)}
          aria-label="ماه"
          items={monthItems}
        />
      </div>
      <div className="jalali-date-picker-column">
        <span className="jalali-date-picker-label">روز</span>
        <WheelPicker
          value={String(safeDay)}
          onChange={(next) => applyChange(year, month, Number(next), hour, minute)}
          aria-label="روز"
          items={dayItems}
        />
      </div>
      <div className="jalali-date-picker-column jalali-datetime-picker-column--time">
        <span className="jalali-date-picker-label">ساعت</span>
        <WheelPicker
          value={String(hour)}
          onChange={(next) => applyChange(year, month, safeDay, Number(next), minute)}
          aria-label="ساعت"
          items={hourItems}
        />
      </div>
      <div className="jalali-date-picker-column jalali-datetime-picker-column--time">
        <span className="jalali-date-picker-label">دقیقه</span>
        <WheelPicker
          value={String(minute)}
          onChange={(next) => applyChange(year, month, safeDay, hour, Number(next))}
          aria-label="دقیقه"
          items={minuteItems}
        />
      </div>
    </div>
  );
}

export default function JalaliDateTimePicker({
  value,
  onChange,
  calendar = 'shamsi',
  minDateTime,
  label,
}: JalaliDateTimePickerProps) {
  const iso = value || getNowDateTimeIso();
  const [editing, setEditing] = useState(false);
  const [pendingValue, setPendingValue] = useState(iso);

  useEffect(() => {
    if (editing) {
      setPendingValue(iso);
    }
  }, [editing, iso, calendar]);

  const handleToggle = () => {
    setEditing((open) => {
      if (!open) {
        setPendingValue(iso);
      }
      return !open;
    });
  };

  const handleConfirm = () => {
    const next = minDateTime ? clampDateTimeToMin(pendingValue, minDateTime) : pendingValue;
    onChange(next);
    setEditing(false);
  };

  const hasPendingChanges = pendingValue !== iso;
  const triggerLabel = value ? formatDateTimePersian(value) : 'انتخاب تاریخ و ساعت';

  return (
    <div className="jalali-date-picker-wrap">
      {label && <span className="jalali-datetime-picker-field-label">{label}</span>}
      <button
        type="button"
        className={`jalali-date-picker-trigger${editing ? ' is-active' : ''}${!value ? ' is-empty' : ''}`}
        onClick={handleToggle}
        aria-expanded={editing}
      >
        {triggerLabel}
      </button>

      {editing && (
        <div className="jalali-date-picker-panel jalali-datetime-picker-panel">
          <DateTimeWheelFields
            calendar={calendar}
            value={pendingValue}
            onChange={setPendingValue}
            minDateTime={minDateTime}
          />
          <div className="records-filter-actions jalali-date-picker-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleConfirm}
              disabled={!hasPendingChanges}
            >
              تایید
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
