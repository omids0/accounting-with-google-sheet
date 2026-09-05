import { useEffect, useMemo, useState } from 'react'

import Button from './ui/Button'
import {
  jalaliDatePickerActionsClass,
  jalaliDatePickerClass,
  jalaliDatePickerColumnClass,
  jalaliDatePickerLabelClass,
  jalaliDatePickerMonthColumnClass,
  jalaliDatePickerPanelClass,
  jalaliDatePickerTriggerClass,
  jalaliDatePickerWrapClass,
  jalaliDatePickerWrapInlineClass
} from './ui/datePickerStyles'
import { cn } from '../utils/cn'
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
    <div className={jalaliDatePickerClass}>
      <div className={jalaliDatePickerColumnClass}>
        <span className={jalaliDatePickerLabelClass}>سال</span>
        <WheelPicker
          value={String(year)}
          onChange={next => update(Number(next), month, safeDay)}
          aria-label="سال"
          items={yearItems}
        />
      </div>
      <div className={cn(jalaliDatePickerColumnClass, jalaliDatePickerMonthColumnClass)}>
        <span className={jalaliDatePickerLabelClass}>ماه</span>
        <WheelPicker
          value={String(month)}
          onChange={next => update(year, Number(next), safeDay)}
          aria-label="ماه"
          items={monthItems}
        />
      </div>
      <div className={jalaliDatePickerColumnClass}>
        <span className={jalaliDatePickerLabelClass}>روز</span>
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
      <div className={cn(jalaliDatePickerWrapClass, jalaliDatePickerWrapInlineClass)}>
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
    <div className={jalaliDatePickerWrapClass}>
      <button
        id={id}
        type="button"
        className={jalaliDatePickerTriggerClass({
          active: editing,
          empty: allowEmpty && !hasValue
        })}
        onClick={handleToggle}
        aria-expanded={editing}
      >
        {triggerLabel}
      </button>

      {editing && (
        <div className={jalaliDatePickerPanelClass}>
          <CalendarWheelFields calendar={calendar} iso={pendingIso} onIsoChange={setPendingIso} />
          <div className={cn('records-filter-actions', jalaliDatePickerActionsClass)}>
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
