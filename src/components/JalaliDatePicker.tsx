import { useEffect, useMemo, useState } from 'react'

import Button from './ui/Button'
import {
  daysInCalendarMonth,
  formatCalendarDateCompact,
  getCalendarMonthWheelItems,
  getCalendarParts,
  getCalendarYearRange,
  partsToIso,
  type CalendarSystem
} from '../utils/dateConverter'
import { formatIsoDatePersian, getTodayIso } from '../utils/jalaliDate'
import WheelPicker from './form/WheelPicker'

interface JalaliDatePickerProps {
  value: string
  onChange: (iso: string) => void
  calendar?: CalendarSystem
  inline?: boolean
  allowEmpty?: boolean
  emptyLabel?: string
  id?: string
}

function fa(n: number): string {
  return n.toLocaleString('fa-IR', { useGrouping: false })
}

function formatPickerLabel(iso: string, calendar: CalendarSystem): string {
  if (calendar === 'shamsi') {
    return formatIsoDatePersian(iso)
  }

  return formatCalendarDateCompact(iso, calendar)
}

interface CalendarWheelFieldsProps {
  calendar: CalendarSystem
  iso: string
  onIsoChange: (iso: string) => void
}

function CalendarWheelFields({ calendar, iso, onIsoChange }: CalendarWheelFieldsProps) {
  const { year, month, day } = getCalendarParts(iso, calendar)

  const years = useMemo(() => getCalendarYearRange(calendar, iso), [calendar, iso])

  const monthItems = useMemo(() => getCalendarMonthWheelItems(calendar), [calendar])

  const maxDay = daysInCalendarMonth(year, month, calendar)

  const safeDay = Math.min(day, maxDay)

  const yearItems = useMemo(
    () =>
      years.map(itemYear => ({
        value: String(itemYear),
        label: fa(itemYear)
      })),
    [years]
  )

  const dayItems = useMemo(() => {
    const dayCount = daysInCalendarMonth(year, month, calendar)

    return Array.from({ length: dayCount }, (_, index) => {
      const itemDay = index + 1

      return { value: String(itemDay), label: fa(itemDay) }
    })
  }, [year, month, calendar])

  const update = (nextYear: number, nextMonth: number, nextDay: number) => {
    const max = daysInCalendarMonth(nextYear, nextMonth, calendar)

    onIsoChange(
      partsToIso({ year: nextYear, month: nextMonth, day: Math.min(nextDay, max) }, calendar)
    )
  }

  return (
    <div className="jalali-date-picker">
      <div className="jalali-date-picker-column">
        <span className="jalali-date-picker-label">سال</span>
        <WheelPicker
          value={String(year)}
          onChange={next => update(Number(next), month, safeDay)}
          aria-label="سال"
          items={yearItems}
        />
      </div>
      <div className="jalali-date-picker-column jalali-date-picker-column--month">
        <span className="jalali-date-picker-label">ماه</span>
        <WheelPicker
          value={String(month)}
          onChange={next => update(year, Number(next), safeDay)}
          aria-label="ماه"
          items={monthItems}
        />
      </div>
      <div className="jalali-date-picker-column">
        <span className="jalali-date-picker-label">روز</span>
        <WheelPicker
          value={String(safeDay)}
          onChange={next => update(year, month, Number(next))}
          aria-label="روز"
          items={dayItems}
        />
      </div>
    </div>
  )
}

export default function JalaliDatePicker({
  value,
  onChange,
  calendar = 'shamsi',
  inline = false,
  allowEmpty = false,
  emptyLabel = 'انتخاب تاریخ',
  id
}: JalaliDatePickerProps) {
  const hasValue = Boolean(value)

  const iso = value || getTodayIso()

  const [editing, setEditing] = useState(false)

  const [pendingIso, setPendingIso] = useState(iso)

  useEffect(() => {
    if (editing) {
      setPendingIso(iso)
    }
  }, [editing, iso, calendar])

  const handleToggle = () => {
    setEditing(open => {
      if (!open) {
        setPendingIso(iso)
      }

      return !open
    })
  }

  const handleConfirm = () => {
    onChange(pendingIso)
    setEditing(false)
  }

  if (inline) {
    return (
      <div className="jalali-date-picker-wrap jalali-date-picker-wrap--inline">
        <CalendarWheelFields
          calendar={calendar}
          iso={hasValue ? iso : getTodayIso()}
          onIsoChange={onChange}
        />
      </div>
    )
  }

  const hasPendingChanges = allowEmpty && !hasValue ? true : pendingIso !== iso

  const triggerLabel = allowEmpty && !hasValue ? emptyLabel : formatPickerLabel(iso, calendar)

  return (
    <div className="jalali-date-picker-wrap">
      <button
        id={id}
        type="button"
        className={`jalali-date-picker-trigger${editing ? ' is-active' : ''}${
          allowEmpty && !hasValue ? ' is-empty' : ''
        }`}
        onClick={handleToggle}
        aria-expanded={editing}
      >
        {triggerLabel}
      </button>

      {editing && (
        <div className="jalali-date-picker-panel">
          <CalendarWheelFields calendar={calendar} iso={pendingIso} onIsoChange={setPendingIso} />
          <div className="records-filter-actions jalali-date-picker-actions">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleConfirm}
              disabled={!hasPendingChanges}
            >
              تایید تاریخ
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
