import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'

import type { DueDaySummary } from '../../../services/dueCalendar'
import { cn, cx } from '../../../utils/cn'
import { getJalaliMonthKey } from '../../../utils/dateRange'
import { formatPersianNumber } from '../../../utils/formatMoney'
import { formatIsoDatePersian, isoToJalali } from '../../../utils/jalaliDate'
import {
  buildJalaliMonthGrid,
  JALALI_WEEKDAYS,
  nextGridDayForKey
} from '../../../utils/jalaliMonthGrid'

const dayButtonClass = cx(
  'relative flex h-10 w-full cursor-pointer flex-col items-center justify-center rounded-[10px]',
  'border-0 bg-transparent font-numeric text-[0.8rem] font-semibold tabular-nums text-text'
)

const overdueDayClass =
  'bg-[var(--color-danger-bg)] text-[color-mix(in_srgb,var(--color-danger)_80%,var(--color-text))]'

const todayDayClass = 'bg-primary text-on-primary'

const selectedDayClass = 'shadow-[inset_0_0_0_2px_var(--color-primary)]'

const dotClass = 'absolute bottom-1 h-1.5 w-1.5 rounded-full'

function dayAriaLabel(iso: string, summary: DueDaySummary | undefined, isToday: boolean): string {
  const parts = [formatIsoDatePersian(iso)]

  parts.push(summary ? `${formatPersianNumber(summary.count)} مورد` : 'بدون مورد')
  if (summary?.overdue) parts.push('معوق')
  if (isToday) parts.push('امروز')

  return parts.join(' · ')
}

/** The day that holds the roving tab stop when the focused one is not in this month. */
function fallbackFocusDay(
  monthKey: string,
  days: string[],
  selected: string | null,
  today: string
): string {
  if (selected && days.includes(selected)) return selected
  if (getJalaliMonthKey(today) === monthKey) return today

  return days[0] ?? ''
}

/**
 * Jalali month grid (ش … ج): a dot on days with items, overdue days red, today
 * filled. One tab stop; arrows move between days the way they look on screen
 * and cross into the neighbouring month.
 */
export default function DueCalendarGrid({
  monthKey,
  monthLabel,
  summaries,
  selectedDay,
  today,
  onSelectDay,
  onMonthChange
}: {
  monthKey: string
  monthLabel: string
  summaries: Map<string, DueDaySummary>
  selectedDay: string | null
  today: string
  onSelectDay: (day: string) => void
  onMonthChange: (monthKey: string) => void
}) {
  const weeks = useMemo(() => buildJalaliMonthGrid(monthKey), [monthKey])
  const days = useMemo(() => weeks.flat().filter((day): day is string => !!day), [weeks])
  const [focusDay, setFocusDay] = useState<string | null>(null)
  const pendingFocus = useRef(false)
  const gridRef = useRef<HTMLDivElement>(null)

  const tabDay =
    focusDay && days.includes(focusDay)
      ? focusDay
      : fallbackFocusDay(monthKey, days, selectedDay, today)

  useEffect(() => {
    if (!pendingFocus.current) return
    pendingFocus.current = false
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${tabDay}"]`)?.focus()
  }, [tabDay])

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, day: string) => {
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl'
    const next = nextGridDayForKey(day, event.key, rtl)

    if (!next) return
    event.preventDefault()
    if (next === day) return

    const nextMonth = getJalaliMonthKey(next)

    if (nextMonth !== monthKey) onMonthChange(nextMonth)
    pendingFocus.current = true
    setFocusDay(next)
  }

  return (
    <div ref={gridRef} role="grid" aria-label={`تقویم سررسیدهای ${monthLabel}`} className="w-full">
      <div role="row" className="grid grid-cols-7 gap-1 pb-1">
        {JALALI_WEEKDAYS.map(weekday => (
          <span
            key={weekday.name}
            role="columnheader"
            aria-label={weekday.name}
            className="text-center text-[0.7rem] font-semibold text-muted"
          >
            {weekday.short}
          </span>
        ))}
      </div>
      {weeks.map(week => (
        <div key={week.find(Boolean)} role="row" className="grid grid-cols-7 gap-1">
          {week.map((day, column) => {
            if (!day) return <span key={`pad-${column}`} aria-hidden="true" />

            const summary = summaries.get(day)
            const isToday = day === today
            const selected = day === selectedDay

            return (
              <span key={day} role="gridcell">
                <button
                  type="button"
                  data-day={day}
                  tabIndex={day === tabDay ? 0 : -1}
                  aria-pressed={selected}
                  aria-current={isToday ? 'date' : undefined}
                  aria-label={dayAriaLabel(day, summary, isToday)}
                  className={cn(
                    dayButtonClass,
                    summary?.overdue && overdueDayClass,
                    isToday && todayDayClass,
                    selected && selectedDayClass
                  )}
                  onClick={() => {
                    setFocusDay(day)
                    onSelectDay(day)
                  }}
                  onKeyDown={event => onKeyDown(event, day)}
                >
                  <span aria-hidden="true">{formatPersianNumber(isoToJalali(day).day)}</span>
                  {summary ? (
                    <span
                      aria-hidden="true"
                      className={cn(
                        dotClass,
                        isToday ? 'bg-on-primary' : summary.overdue ? 'bg-danger' : 'bg-primary'
                      )}
                    />
                  ) : null}
                </button>
              </span>
            )
          })}
        </div>
      ))}
    </div>
  )
}
