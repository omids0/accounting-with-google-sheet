import { useMemo } from 'react'

import WheelPicker from './form/WheelPicker'
import {
  jalaliDatePickerColumnClass,
  jalaliDatePickerLabelClass,
  jalaliDatePickerMonthColumnClass,
  jalaliDateTimePickerClass,
  jalaliDateTimePickerColonClass,
  jalaliDateTimePickerTimeColumnClass,
  jalaliDateTimePickerTimeGroupClass
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
import { clampDateTimeToMin, fromDateTimeIso, toDateTimeIso } from '../utils/datetime'

function fa(n: number): string {
  return n.toLocaleString('fa-IR', { useGrouping: false })
}

interface DateTimeWheelFieldsProps {
  calendar: CalendarSystem
  value: string
  onChange: (iso: string) => void
  minDateTime?: string
}

export default function DateTimeWheelFields({
  calendar,
  value,
  onChange,
  minDateTime
}: DateTimeWheelFieldsProps) {
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
    () => years.map(itemYear => ({ value: String(itemYear), label: fa(itemYear) })),
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
    <div className={jalaliDateTimePickerClass}>
      <div className={jalaliDateTimePickerTimeGroupClass} dir="ltr">
        <div className={cn(jalaliDatePickerColumnClass, jalaliDateTimePickerTimeColumnClass)}>
          <span className={jalaliDatePickerLabelClass}>ساعت</span>
          <WheelPicker
            value={String(safeHour)}
            onChange={next => applyChange(year, month, safeDay, Number(next), safeMinute)}
            aria-label="ساعت"
            items={hourItems}
          />
        </div>
        <span className={jalaliDateTimePickerColonClass} aria-hidden="true">
          :
        </span>
        <div className={cn(jalaliDatePickerColumnClass, jalaliDateTimePickerTimeColumnClass)}>
          <span className={jalaliDatePickerLabelClass}>دقیقه</span>
          <WheelPicker
            value={String(safeMinute)}
            onChange={next => applyChange(year, month, safeDay, safeHour, Number(next))}
            aria-label="دقیقه"
            items={minuteItems}
          />
        </div>
      </div>
      <div className={jalaliDatePickerColumnClass}>
        <span className={jalaliDatePickerLabelClass}>سال</span>
        <WheelPicker
          value={String(year)}
          onChange={next => applyChange(Number(next), month, safeDay, safeHour, safeMinute)}
          aria-label="سال"
          items={yearItems}
        />
      </div>
      <div className={cn(jalaliDatePickerColumnClass, jalaliDatePickerMonthColumnClass)}>
        <span className={jalaliDatePickerLabelClass}>ماه</span>
        <WheelPicker
          value={String(month)}
          onChange={next => applyChange(year, Number(next), safeDay, safeHour, safeMinute)}
          aria-label="ماه"
          items={filteredMonthItems}
        />
      </div>
      <div className={jalaliDatePickerColumnClass}>
        <span className={jalaliDatePickerLabelClass}>روز</span>
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
