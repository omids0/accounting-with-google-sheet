import { useEffect, useState } from 'react';
import {
  daysInJalaliMonth,
  formatIsoDatePersian,
  getJalaliParts,
  getTodayIso,
  isoToJalali,
  jalaliToIso,
  JALALI_MONTHS,
} from '../utils/jalaliDate';
import WheelPicker from './form/WheelPicker';

interface JalaliDatePickerProps {
  value: string;
  onChange: (iso: string) => void;
}

function fa(n: number): string {
  return n.toLocaleString('fa-IR', { useGrouping: false });
}

export default function JalaliDatePicker({ value, onChange }: JalaliDatePickerProps) {
  const iso = value || getTodayIso();
  const [editing, setEditing] = useState(false);
  const [pendingIso, setPendingIso] = useState(iso);
  const { year, month, day } = isoToJalali(pendingIso);
  const today = getJalaliParts(new Date());
  const years = Array.from({ length: 21 }, (_, i) => today.year - 10 + i);
  const maxDay = daysInJalaliMonth(year, month);
  const safeDay = Math.min(day, maxDay);
  const days = Array.from({ length: maxDay }, (_, i) => i + 1);

  useEffect(() => {
    if (editing) {
      setPendingIso(iso);
    }
  }, [editing, iso]);

  const update = (jy: number, jm: number, jd: number) => {
    const max = daysInJalaliMonth(jy, jm);
    setPendingIso(jalaliToIso(jy, jm, Math.min(jd, max)));
  };

  const handleToggle = () => {
    setEditing((open) => {
      if (!open) {
        setPendingIso(iso);
      }
      return !open;
    });
  };

  const handleConfirm = () => {
    onChange(pendingIso);
    setEditing(false);
  };

  const hasPendingChanges = pendingIso !== iso;

  return (
    <div className="jalali-date-picker-wrap">
      <button
        type="button"
        className={`jalali-date-picker-trigger${editing ? ' is-active' : ''}`}
        onClick={handleToggle}
        aria-expanded={editing}
      >
        {formatIsoDatePersian(iso)}
      </button>

      {editing && (
        <div className="jalali-date-picker-panel">
          <div className="jalali-date-picker">
            <div className="jalali-date-picker-column">
              <span className="jalali-date-picker-label">سال</span>
              <WheelPicker
                value={String(year)}
                onChange={(next) => update(Number(next), month, safeDay)}
                aria-label="سال"
                items={years.map((y) => ({ value: String(y), label: fa(y) }))}
              />
            </div>
            <div className="jalali-date-picker-column jalali-date-picker-column--month">
              <span className="jalali-date-picker-label">ماه</span>
              <WheelPicker
                value={String(month)}
                onChange={(next) => update(year, Number(next), safeDay)}
                aria-label="ماه"
                items={JALALI_MONTHS.map((name, i) => ({
                  value: String(i + 1),
                  label: name,
                }))}
              />
            </div>
            <div className="jalali-date-picker-column">
              <span className="jalali-date-picker-label">روز</span>
              <WheelPicker
                value={String(safeDay)}
                onChange={(next) => update(year, month, Number(next))}
                aria-label="روز"
                items={days.map((d) => ({ value: String(d), label: fa(d) }))}
              />
            </div>
          </div>
          <div className="records-filter-actions jalali-date-picker-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleConfirm}
              disabled={!hasPendingChanges}
            >
              تایید تاریخ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
