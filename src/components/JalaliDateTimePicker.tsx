import { useEffect, useMemo, useRef, useState } from 'react'

import Button from './ui/Button'
import {
  daysInCalendarMonth,
  getCalendarMonthWheelItems,
  getCalendarParts,
  getCalendarYearRange,
  partsToIso,
  type CalendarSystem
} from '../utils/dateConverter'
import {
  clampDateTimeToMin,
  formatDateTimePersian,
  fromDateTimeIso,
  getNowDateTimeIso,
  normalizeDateTimeIso,
  toDateTimeIso
} from '../utils/datetime'
import WheelPicker from './form/WheelPicker'

interface JalaliDateTimePickerProps {
  value: string
  onChange: (iso: string) => void
  calendar?: CalendarSystem
  minDateTime?: string
  label?: string
  openRequestToken?: number
}

function fa(n: number): string {
  return n.toLocaleString('fa-IR', { useGrouping: false })
}

interface DateTimeWheelFieldsProps {
  calendar: CalendarSystem
  value: string
  onChange: (iso: string) => void
  minDateTime?: string
}

function DateTimeWheelFields({ calendar, value, onChange, minDateTime }: DateTimeWheelFieldsProps) {
  const { dateIso, hour, minute } = fromDateTimeIso(value)

  const { year, month, day } = getCalendarParts(dateIso, calendar)

  const minParts = minDateTime ? fromDateTimeIso(minDateTime) : null

  const minCal = minParts ? getCalendarParts(minParts.dateIso, calendar) : null

  const years = useMemo(() => getCalendarYearRange(calendar, dateIso), [calendar, dateIso])

  const monthItems = useMemo(() => getCalendarMonthWheelItems(calendar), [calendar])

  const maxDay = daysInCalendarMonth(year, month, calendar)

  const minMonth = minCal && year === minCal.year ? minCal.month : 1

  const minDay = minCal && year === minCal.year && month === minCal.month ? minCal.day : 1

  const minHour = minParts && dateIso === minParts.dateIso ? minParts.hour : 0

  const minMinute =
    minParts && dateIso === minParts.dateIso && hour === minParts.hour ? minParts.minute : 0

  const safeDay = Math.min(Math.max(day, minDay), maxDay)

  const safeHour = Math.max(hour, minHour)

  const safeMinute = Math.max(minute, minMinute)

  const yearItems = useMemo(
    () =>
      years.map(itemYear => ({
        value: String(itemYear),
        label: fa(itemYear)
      })),
    [years]
  )

  const filteredMonthItems = useMemo(
    () => monthItems.filter(item => Number(item.value) >= minMonth),
    [monthItems, minMonth]
  )

  const dayItems = useMemo(() => {
    const dayCount = daysInCalendarMonth(year, month, calendar)

    return Array.from({ length: dayCount - minDay + 1 }, (_, index) => {
      const itemDay = minDay + index

      return { value: String(itemDay), label: fa(itemDay) }
    })
  }, [year, month, calendar, minDay])

  const hourItems = useMemo(
    () =>
      Array.from({ length: 24 - minHour }, (_, index) => {
        const itemHour = minHour + index

        return { value: String(itemHour), label: fa(itemHour) }
      }),
    [minHour]
  )

  const minuteItems = useMemo(
    () =>
      Array.from({ length: 60 - minMinute }, (_, index) => {
        const itemMinute = minMinute + index

        return {
          value: String(itemMinute),
          label: String(itemMinute).padStart(2, '0')
        }
      }),
    [minMinute]
  )

  const applyChange = (
    nextYear: number,
    nextMonth: number,
    nextDay: number,
    nextHour: number,
    nextMinute: number
  ) => {
    const max = daysInCalendarMonth(nextYear, nextMonth, calendar)

    const nextDateIso = partsToIso(
      { year: nextYear, month: nextMonth, day: Math.min(Math.max(nextDay, 1), max) },
      calendar
    )

    const nextValue = toDateTimeIso(nextDateIso, nextHour, nextMinute)

    onChange(minDateTime ? clampDateTimeToMin(nextValue, minDateTime) : nextValue)
  }

  return (
    <div className="jalali-date-picker jalali-datetime-picker">
      <div className="jalali-datetime-picker-time-group" dir="ltr">
        <div className="jalali-date-picker-column jalali-datetime-picker-column--time">
          <span className="jalali-date-picker-label">ساعت</span>
          <WheelPicker
            value={String(safeHour)}
            onChange={next => applyChange(year, month, safeDay, Number(next), safeMinute)}
            aria-label="ساعت"
            items={hourItems}
          />
        </div>
        <span className="jalali-datetime-picker-time-colon" aria-hidden="true">
          :
        </span>
        <div className="jalali-date-picker-column jalali-datetime-picker-column--time">
          <span className="jalali-date-picker-label">دقیقه</span>
          <WheelPicker
            value={String(safeMinute)}
            onChange={next => applyChange(year, month, safeDay, safeHour, Number(next))}
            aria-label="دقیقه"
            items={minuteItems}
          />
        </div>
      </div>
      <div className="jalali-date-picker-column">
        <span className="jalali-date-picker-label">سال</span>
        <WheelPicker
          value={String(year)}
          onChange={next => applyChange(Number(next), month, safeDay, safeHour, safeMinute)}
          aria-label="سال"
          items={yearItems}
        />
      </div>
      <div className="jalali-date-picker-column jalali-date-picker-column--month">
        <span className="jalali-date-picker-label">ماه</span>
        <WheelPicker
          value={String(month)}
          onChange={next => applyChange(year, Number(next), safeDay, safeHour, safeMinute)}
          aria-label="ماه"
          items={filteredMonthItems}
        />
      </div>
      <div className="jalali-date-picker-column">
        <span className="jalali-date-picker-label">روز</span>
        <WheelPicker
          value={String(safeDay)}
          onChange={next => applyChange(year, month, Number(next), safeHour, safeMinute)}
          aria-label="روز"
          items={dayItems}
        />
      </div>
    </div>
  )
}

export default function JalaliDateTimePicker({
  value,
  onChange,
  calendar = 'shamsi',
  minDateTime,
  label,
  openRequestToken = 0
}: JalaliDateTimePickerProps) {
  const iso = value || getNowDateTimeIso()

  const [editing, setEditing] = useState(false)

  const [pendingValue, setPendingValue] = useState(iso)

  const lastOpenRequestTokenRef = useRef(0)

  useEffect(() => {
    if (editing) {
      setPendingValue(iso)
    }
  }, [editing, iso, calendar])

  useEffect(() => {
    if (!minDateTime || !editing) return
    setPendingValue(current => clampDateTimeToMin(current, minDateTime))
  }, [minDateTime, editing])

  useEffect(() => {
    if (!openRequestToken || openRequestToken === lastOpenRequestTokenRef.current) return
    lastOpenRequestTokenRef.current = openRequestToken

    const nextValue = minDateTime ? clampDateTimeToMin(iso, minDateTime) : iso

    setPendingValue(nextValue)
    setEditing(true)
  }, [openRequestToken, iso, minDateTime])

  const handleToggle = () => {
    setEditing(open => {
      if (!open) {
        setPendingValue(minDateTime ? clampDateTimeToMin(iso, minDateTime) : iso)
      }

      return !open
    })
  }

  const handleConfirm = () => {
    const next = minDateTime ? clampDateTimeToMin(pendingValue, minDateTime) : pendingValue

    const currentValue = value ? normalizeDateTimeIso(value) : ''

    const nextValue = normalizeDateTimeIso(next)

    if (nextValue !== currentValue) {
      onChange(next)
    }
    setEditing(false)
  }

  const triggerLabel = value ? formatDateTimePersian(value) : 'انتخاب تاریخ و ساعت'

  return (
    <div className="jalali-date-picker-wrap">
      {label && <span className="jalali-datetime-picker-field-label">{label}</span>}
      <button
        type="button"
        className={`jalali-date-picker-trigger${editing ? ' is-active' : ''}${
          !value ? ' is-empty' : ''
        }`}
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
            <Button type="button" variant="primary" size="sm" onClick={handleConfirm}>
              تایید
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
