import { useMemo, useRef, type KeyboardEvent } from 'react'

import { DAY_STATE_WORDS, EVENT_KIND_LABELS, forecastDayLabel } from './forecastLabels'
import ForecastMoney from './ForecastMoney'
import { useMaskedText } from '../../hooks/useAmountsHidden'
import type { ForecastDay, ForecastDayState } from '../../services/cashForecast'
import { cn, cx } from '../../utils/cn'
import { getJalaliMonthKey } from '../../utils/dateRange'
import { formatMoney, formatPersianNumber } from '../../utils/formatMoney'
import { isoToJalali, JALALI_MONTHS } from '../../utils/jalaliDate'
import {
  JALALI_WEEKDAYS,
  nextGridDayForKey,
  saturdayFirstColumn
} from '../../utils/jalaliMonthGrid'
import CalmBlock from '../CalmBlock'
import { calmEmptyClass, calmListClass, calmRowClass } from '../ui/calmListStyles'

const dayClass = cx(
  'focus-ring-inset relative flex h-11 w-full cursor-pointer flex-col items-center justify-center rounded-[10px]',
  'border-0 font-numeric text-[0.8rem] font-semibold tabular-nums leading-tight text-text'
)

const stateClass: Record<ForecastDayState, string> = {
  ok: 'bg-[var(--color-success-bg)]',
  tight: 'bg-[var(--color-warning-bg)]',
  negative: 'bg-[var(--color-danger-bg)] text-danger'
}

const markClass = 'text-[0.7rem] font-medium leading-none'

const selectedClass = 'shadow-[inset_0_0_0_2px_var(--color-primary)]'

/** The days of the view grouped by Jalali month, so each group lines its weekdays up. */
function groupByMonth(days: ForecastDay[]): { key: string; days: ForecastDay[] }[] {
  const groups: { key: string; days: ForecastDay[] }[] = []

  for (const day of days) {
    const key = getJalaliMonthKey(day.date)
    const last = groups[groups.length - 1]

    if (last?.key === key) last.days.push(day)
    else groups.push({ key, days: [day] })
  }

  return groups
}

/**
 * A calendar of the estimate: each day shows its state in a word as well as a colour; tapping one
 * lists what happens on it. One tab stop, arrows move between days the way they look on screen.
 */
export default function ForecastDayGrid({
  days,
  selected,
  onSelect
}: {
  days: ForecastDay[]
  selected: string
  onSelect: (date: string) => void
}) {
  const masked = useMaskedText()
  const gridRef = useRef<HTMLDivElement>(null)
  const groups = useMemo(() => groupByMonth(days), [days])
  const known = useMemo(() => new Set(days.map(day => day.date)), [days])
  const current = days.find(day => day.date === selected) ?? days[0]

  const onKeyDown = (event: KeyboardEvent, date: string) => {
    const next = nextGridDayForKey(date, event.key, true)

    if (!next || !known.has(next)) return
    event.preventDefault()
    onSelect(next)
    requestAnimationFrame(() =>
      gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${next}"]`)?.focus()
    )
  }

  return (
    <CalmBlock title="روز به روز">
      <div ref={gridRef} className="flex flex-col gap-3">
        {groups.map(group => {
          const monthName = JALALI_MONTHS[isoToJalali(group.days[0].date).month - 1]

          return (
            <div key={group.key}>
              <h3 className="m-0 mb-1 text-[0.78rem] font-bold text-text">{monthName}</h3>
              <div
                className="grid grid-cols-7 gap-1 text-center"
                role="group"
                aria-label={monthName}
              >
                {JALALI_WEEKDAYS.map(weekday => (
                  <span
                    key={weekday.name}
                    className="text-[0.72rem] text-muted"
                    title={weekday.name}
                  >
                    {weekday.short}
                  </span>
                ))}
                {Array.from({ length: saturdayFirstColumn(group.days[0].date) }, (_, index) => (
                  <span key={`blank-${index}`} aria-hidden="true" />
                ))}
                {group.days.map(day => {
                  const isSelected = day.date === current.date
                  const events = day.events.length

                  return (
                    <button
                      key={day.date}
                      type="button"
                      data-day={day.date}
                      tabIndex={isSelected ? 0 : -1}
                      aria-pressed={isSelected}
                      aria-label={masked(
                        `${forecastDayLabel(day.date)}: ${
                          DAY_STATE_WORDS[day.state]
                        }، مانده برآوردی ${formatMoney(day.balance)}${
                          events ? `، ${formatPersianNumber(events)} سررسید` : ''
                        }`
                      )}
                      className={cn(dayClass, stateClass[day.state], isSelected && selectedClass)}
                      onClick={() => onSelect(day.date)}
                      onKeyDown={event => onKeyDown(event, day.date)}
                    >
                      <span>{formatPersianNumber(isoToJalali(day.date).day)}</span>
                      <span className={markClass} aria-hidden="true">
                        {day.state === 'ok' ? (events ? '•' : '') : DAY_STATE_WORDS[day.state]}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div aria-live="polite" className="mt-3">
        <h3 className="m-0 text-[0.82rem] font-bold text-text">
          <bdi>{forecastDayLabel(current.date)}</bdi> · مانده برآوردی{' '}
          <ForecastMoney amount={current.balance} />
        </h3>
        {current.events.length ? (
          <ul className={calmListClass}>
            {current.events.map(event => (
              <li key={event.id} className={calmRowClass}>
                <span className="min-w-0 flex-1 text-[0.82rem]">
                  {EVENT_KIND_LABELS[event.kind]} <bdi>{event.title}</bdi>
                  {event.late ? ' · عقب‌افتاده، امروز حساب شد' : ''}
                </span>
                <span className="shrink-0 font-numeric text-[0.8rem] font-bold tabular-nums">
                  <ForecastMoney amount={event.amount} signed="plus" />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={calmEmptyClass}>سررسیدی نیست؛ فقط خرج روزانهٔ فرضی کم می‌شود.</p>
        )}
      </div>
    </CalmBlock>
  )
}
