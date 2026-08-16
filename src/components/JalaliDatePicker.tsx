import {
  daysInJalaliMonth,
  getJalaliParts,
  getTodayIso,
  isoToJalali,
  jalaliToIso,
  JALALI_MONTHS,
} from '../utils/jalaliDate';
import Select from './Select';

interface JalaliDatePickerProps {
  value: string;
  onChange: (iso: string) => void;
}

function fa(n: number): string {
  return n.toLocaleString('fa-IR');
}

export default function JalaliDatePicker({ value, onChange }: JalaliDatePickerProps) {
  const iso = value || getTodayIso();
  const { year, month, day } = isoToJalali(iso);
  const today = getJalaliParts(new Date());
  const years = Array.from({ length: 21 }, (_, i) => today.year - 10 + i);
  const maxDay = daysInJalaliMonth(year, month);
  const safeDay = Math.min(day, maxDay);
  const days = Array.from({ length: maxDay }, (_, i) => i + 1);

  const update = (jy: number, jm: number, jd: number) => {
    const max = daysInJalaliMonth(jy, jm);
    onChange(jalaliToIso(jy, jm, Math.min(jd, max)));
  };

  return (
    <div className="jalali-date-picker">
      <Select
        compact
        value={String(year)}
        onChange={(next) => update(Number(next), month, safeDay)}
        aria-label="سال"
        options={years.map((y) => ({ value: String(y), label: fa(y) }))}
      />
      <Select
        compact
        value={String(month)}
        onChange={(next) => update(year, Number(next), safeDay)}
        aria-label="ماه"
        options={JALALI_MONTHS.map((name, i) => ({
          value: String(i + 1),
          label: name,
        }))}
      />
      <Select
        compact
        value={String(safeDay)}
        onChange={(next) => update(year, month, Number(next))}
        aria-label="روز"
        options={days.map((d) => ({ value: String(d), label: fa(d) }))}
      />
    </div>
  );
}
