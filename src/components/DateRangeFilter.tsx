import { useEffect, useState } from 'react'

import JalaliDatePicker from './JalaliDatePicker'
import Button from './ui/Button'
import {
  recordsCustomDateClass,
  recordsCustomRangeClass,
  recordsDateGridBtnClass,
  recordsDateGridClass,
  recordsFilterActionsClass,
  recordsFilterLabelClass,
  recordsFilterSectionClassName
} from './ui/recordsStyles'
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
      <div className={recordsFilterSectionClassName()}>
        <span className={recordsFilterLabelClass}>{label}</span>
        <div className={recordsDateGridClass}>
          {includeAll && (
            <button
              type="button"
              className={recordsDateGridBtnClass(isPresetActive('all'))}
              onClick={() => handlePresetClick('all')}
            >
              همه
            </button>
          )}
          {RECORDS_DATE_RANGE_PRESETS.map(item => (
            <button
              key={item.id}
              type="button"
              className={recordsDateGridBtnClass(isPresetActive(item.id))}
              onClick={() => handlePresetClick(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {showCustomPickers && (
        <div className={recordsCustomRangeClass}>
          <div className={recordsCustomDateClass}>
            <span className={recordsFilterLabelClass}>از</span>
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
          <div className={recordsCustomDateClass}>
            <span className={recordsFilterLabelClass}>تا</span>
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
          <div className={recordsFilterActionsClass}>
            <Button
              type="button"
              variant="primary"
              onClick={handleConfirmCustom}
              disabled={loading || !hasPendingCustomChanges}
            >
              تایید بازه
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
