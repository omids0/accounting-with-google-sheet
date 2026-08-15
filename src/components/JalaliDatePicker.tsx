import {
  daysInJalaliMonth,
  getJalaliParts,
  getTodayIso,
  isoToJalali,
  jalaliToIso,
  JALALI_MONTHS,
} from '../utils/jalaliDate';

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
      <select
        value={year}
        onChange={(e) => update(Number(e.target.value), month, safeDay)}
        aria-label="سال"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {fa(y)}
          </option>
        ))}
      </select>
      <select
        value={month}
        onChange={(e) => update(year, Number(e.target.value), safeDay)}
        aria-label="ماه"
      >
        {JALALI_MONTHS.map((name, i) => (
          <option key={i + 1} value={i + 1}>
            {name}
          </option>
        ))}
      </select>
      <select
        value={safeDay}
        onChange={(e) => update(year, month, Number(e.target.value))}
        aria-label="روز"
      >
        {days.map((d) => (
          <option key={d} value={d}>
            {fa(d)}
          </option>
        ))}
      </select>
    </div>
  );
}
