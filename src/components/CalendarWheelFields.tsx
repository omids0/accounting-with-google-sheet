import { useMemo } from 'react'

import WheelPicker from './form/WheelPicker'
import {
  jalaliDatePickerClass,
  jalaliDatePickerColumnClass,
  jalaliDatePickerLabelClass,
  jalaliDatePickerMonthColumnClass
} from './ui/datePickerStyles'
import { cn } from '../utils/cn'
import {
  daysInCalendarMonth,
  getCalendarMonthWheelItems,
  getCalendarParts,
  getCalendarYearRange,
  partsToIso,
  type CalendarSystem
} from '../utils/dateConverter'

function fa(n: number): string {
  return n.toLocaleString('fa-IR', { useGrouping: false })
}

interface CalendarWheelFieldsProps {
  calendar: CalendarSystem
  iso: string
  onIsoChange: (iso: string) => void
  className?: string
  /** Earliest selectable date; wheels hide anything before it. */
  minIso?: string
}

export default function CalendarWheelFields({
  calendar,
  iso,
  onIsoChange,
  className,
  minIso
}: CalendarWheelFieldsProps) {
  const effectiveIso = minIso && iso && iso < minIso ? minIso : iso

  const { year, month, day } = getCalendarParts(effectiveIso, calendar)

  const minParts = useMemo(
    () => (minIso ? getCalendarParts(minIso, calendar) : null),
    [minIso, calendar]
  )

  const years = useMemo(() => {
    const range = getCalendarYearRange(calendar, effectiveIso)

    return minParts ? range.filter(itemYear => itemYear >= minParts.year) : range
  }, [calendar, effectiveIso, minParts])

  const monthItems = useMemo(() => {
    const items = getCalendarMonthWheelItems(calendar)

    if (!minParts || year !== minParts.year) return items

    return items.filter(item => Number(item.value) >= minParts.month)
  }, [calendar, minParts, year])

  const maxDay = daysInCalendarMonth(year, month, calendar)

  const minDay = minParts && year === minParts.year && month === minParts.month ? minParts.day : 1

  const safeDay = Math.min(Math.max(day, minDay), maxDay)

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

    const from = minParts && year === minParts.year && month === minParts.month ? minParts.day : 1

    const items: { value: string; label: string }[] = []

    for (let itemDay = from; itemDay <= dayCount; itemDay += 1) {
      items.push({ value: String(itemDay), label: fa(itemDay) })
    }

    return items
  }, [year, month, calendar, minParts])

  const update = (nextYear: number, nextMonth: number, nextDay: number) => {
    const max = daysInCalendarMonth(nextYear, nextMonth, calendar)

    const nextIso = partsToIso(
      { year: nextYear, month: nextMonth, day: Math.min(nextDay, max) },
      calendar
    )

    onIsoChange(minIso && nextIso < minIso ? minIso : nextIso)
  }

  return (
    <div className={cn(jalaliDatePickerClass, className)}>
      <div className={jalaliDatePickerColumnClass}>
        <span className={jalaliDatePickerLabelClass}>روز</span>
        <WheelPicker
          value={String(safeDay)}
          onChange={next => update(year, month, Number(next))}
          aria-label="روز"
          items={dayItems}
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
        <span className={jalaliDatePickerLabelClass}>سال</span>
        <WheelPicker
          value={String(year)}
          onChange={next => update(Number(next), month, safeDay)}
          aria-label="سال"
          items={yearItems}
        />
      </div>
    </div>
  )
}
