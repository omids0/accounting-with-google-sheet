import { useEffect, useState } from 'react'

import JalaliDatePicker from './JalaliDatePicker'
import {
  getDateRange,
  RECORDS_DATE_RANGE_PRESETS,
  type DateRange,
  type DateRangePreset,
  type RecordsDatePreset
} from '../utils/dateRange'

export type DateRangeFilterPreset = RecordsDatePreset | 'all'

export type AppliedDateRangeFilter = {
  preset: DateRangeFilterPreset
  customRange: DateRange
}

export function createDefaultDateRangeFilter(): AppliedDateRangeFilter {
  return {
    preset: 'month-to-date',
    customRange: getDateRange('month-to-date')
  }
}

export function createAllDateRangeFilter(): AppliedDateRangeFilter {
  return {
    preset: 'all',
    customRange: getDateRange('month-to-date')
  }
}

export default function DateRangeFilter({
  preset,
  customRange,
  onChange,
  loading,
  includeAll = false,
  label = 'بازه زمانی'
}: {
  preset: DateRangeFilterPreset
  customRange: DateRange
  onChange: (filter: AppliedDateRangeFilter) => void
  loading?: boolean
  includeAll?: boolean
  label?: string
}) {
  const [editingCustom, setEditingCustom] = useState(false)

  const [pendingCustomRange, setPendingCustomRange] = useState(customRange)

  useEffect(() => {
    if (preset === 'custom') {
      setPendingCustomRange(customRange)
    }
  }, [preset, customRange])

  const showCustomPickers = preset === 'custom' || editingCustom

  const hasPendingCustomChanges =
    (editingCustom && preset !== 'custom') ||
    pendingCustomRange.start !== customRange.start ||
    pendingCustomRange.end !== customRange.end

  const handlePresetClick = (id: DateRangeFilterPreset) => {
    if (id === 'all') {
      setEditingCustom(false)
      onChange({ preset: 'all', customRange })

      return
    }
    if (id === 'custom') {
      setEditingCustom(true)
      setPendingCustomRange(preset === 'custom' ? customRange : getDateRange('month-to-date'))

      return
    }
    setEditingCustom(false)
    onChange({ preset: id, customRange: getDateRange(id as DateRangePreset) })
  }

  const handleConfirmCustom = () => {
    setEditingCustom(false)
    onChange({ preset: 'custom', customRange: pendingCustomRange })
  }

  const isPresetActive = (id: DateRangeFilterPreset) => {
    if (id === 'all') return preset === 'all'
    if (id === 'custom') return preset === 'custom' || editingCustom

    return preset === id && !editingCustom
  }

  return (
    <>
      <div className="records-filter-section">
        <span className="records-filter-label">{label}</span>
        <div className="records-date-grid">
          {includeAll && (
            <button
              type="button"
              className={isPresetActive('all') ? 'active' : ''}
              onClick={() => handlePresetClick('all')}
            >
              همه
            </button>
          )}
          {RECORDS_DATE_RANGE_PRESETS.map(item => (
            <button
              key={item.id}
              type="button"
              className={isPresetActive(item.id) ? 'active' : ''}
              onClick={() => handlePresetClick(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {showCustomPickers && (
        <div className="records-custom-range">
          <div className="records-custom-date">
            <span className="records-filter-label">از</span>
            <JalaliDatePicker
              value={pendingCustomRange.start}
              onChange={start =>
                setPendingCustomRange(range => ({
                  ...range,
                  start,
                  end: start > range.end ? start : range.end
                }))
              }
            />
          </div>
          <div className="records-custom-date">
            <span className="records-filter-label">تا</span>
            <JalaliDatePicker
              value={pendingCustomRange.end}
              onChange={end =>
                setPendingCustomRange(range => ({
                  ...range,
                  end,
                  start: end < range.start ? end : range.start
                }))
              }
            />
          </div>
          <div className="records-filter-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleConfirmCustom}
              disabled={loading || !hasPendingCustomChanges}
            >
              تایید بازه
            </button>
          </div>
        </div>
      )}
    </>
  )
}
