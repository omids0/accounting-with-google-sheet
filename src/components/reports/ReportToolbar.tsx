import { useCallback, useMemo, useState } from 'react';
import DateRangeFilter, {
  createDefaultDateRangeFilter,
  type AppliedDateRangeFilter,
} from '../DateRangeFilter';
import { formatDateRangeLabel, resolveDateRange, type RecordsDatePreset } from '../../utils/dateRange';
import type { DateRange } from '../../utils/jalaliDate';

interface ReportToolbarProps {
  title: string;
  preset: RecordsDatePreset;
  customRange: DateRange;
  onFilterChange: (filter: AppliedDateRangeFilter) => void;
  onRefresh: () => void;
  loading?: boolean;
  showDateFilter?: boolean;
  subtitle?: string;
}

export default function ReportToolbar({
  title,
  preset,
  customRange,
  onFilterChange,
  onRefresh,
  loading = false,
  showDateFilter = true,
  subtitle,
}: ReportToolbarProps) {
  const dateRange = resolveDateRange(preset, customRange);

  return (
    <div className="card records-toolbar dashboard-toolbar">
      <div className="records-toolbar-header">
        <div className="records-toolbar-heading">
          <h2 className="records-toolbar-title">{title}</h2>
          <p className="records-toolbar-range">
            {subtitle ?? (showDateFilter ? formatDateRangeLabel(dateRange) : '')}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm records-refresh-btn"
          onClick={onRefresh}
          disabled={loading}
          aria-label="بارگذاری مجدد"
        >
          {loading ? '...' : '↻'}
        </button>
      </div>

      {showDateFilter && (
        <DateRangeFilter
          preset={preset}
          customRange={customRange}
          onChange={onFilterChange}
          loading={loading}
        />
      )}
    </div>
  );
}

export function useReportDateFilter() {
  const [datePreset, setDatePreset] = useState<RecordsDatePreset>('month-to-date');
  const [customRange, setCustomRange] = useState(
    () => createDefaultDateRangeFilter().customRange
  );

  const handleDateFilterChange = useCallback((filter: AppliedDateRangeFilter) => {
    if (filter.preset === 'all') return;
    setDatePreset(filter.preset);
    setCustomRange(filter.customRange);
  }, []);

  const dateRange = useMemo(
    () => resolveDateRange(datePreset, customRange),
    [datePreset, customRange.start, customRange.end]
  );

  return {
    datePreset,
    customRange,
    handleDateFilterChange,
    dateRange,
  };
}
