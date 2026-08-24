import { useEffect, useState, type ReactNode } from 'react';
import WheelPicker from './form/WheelPicker';
import { formatJalaliYear } from '../utils/dateRange';
import { getJalaliParts } from '../utils/jalaliDate';

export function getDefaultChartYear(): number {
  return getJalaliParts(new Date()).year;
}

type YearFilterParts = {
  trigger: ReactNode;
  panel: ReactNode;
};

export default function YearFilter({
  year,
  onChange,
  loading,
  children,
}: {
  year: number;
  onChange: (year: number) => void;
  loading?: boolean;
  children?: (parts: YearFilterParts) => ReactNode;
}) {
  const currentYear = getDefaultChartYear();
  const [editing, setEditing] = useState(false);
  const [pendingYear, setPendingYear] = useState(String(year));
  const wheelYears = Array.from({ length: 21 }, (_, index) => currentYear - 10 + index);

  useEffect(() => {
    if (editing) {
      setPendingYear(String(year));
    }
  }, [editing, year]);

  const handleToggle = () => {
    setEditing((open) => {
      if (!open) {
        setPendingYear(String(year));
      }
      return !open;
    });
  };

  const handleConfirm = () => {
    const nextYear = Number(pendingYear);
    if (!nextYear) return;
    setEditing(false);
    onChange(nextYear);
  };

  const hasPendingChanges = Number(pendingYear) !== year;

  const trigger = (
    <button
      type="button"
      className={`btn btn-secondary btn-sm year-filter-trigger${
        editing ? ' year-filter-trigger-active' : ''
      }`}
      onClick={handleToggle}
    >
      {formatJalaliYear(year)}
    </button>
  );

  const panel = editing ? (
    <div className="records-custom-range year-filter-panel">
      <div className="records-filter-section records-filter-section--inline">
        <span className="records-filter-label">انتخاب سال</span>
        <WheelPicker
          aria-label="انتخاب سال"
          value={pendingYear}
          onChange={setPendingYear}
          items={wheelYears.map((nextYear) => ({
            value: String(nextYear),
            label: formatJalaliYear(nextYear),
          }))}
        />
      </div>
      <div className="records-filter-actions">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={handleConfirm}
          disabled={loading || !hasPendingChanges}
        >
          تایید سال
        </button>
      </div>
    </div>
  ) : null;

  if (children) {
    return <>{children({ trigger, panel })}</>;
  }

  return (
    <>
      {trigger}
      {panel}
    </>
  );
}
