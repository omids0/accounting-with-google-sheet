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
}

export default function CalendarWheelFields({
  calendar,
  iso,
  onIsoChange,
  className
}: CalendarWheelFieldsProps) {
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
