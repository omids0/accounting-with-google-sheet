import { useMemo, useState } from 'react'

import DueCalendarGrid from './DueCalendarGrid'
import { useDueCalendarItems } from './useDueCalendarItems'
import { orderDashboardReminders } from '../../../services/dashboardReminders'
import { dueItemsInMonth, summarizeDueDays } from '../../../services/dueCalendar'
import { cx } from '../../../utils/cn'
import {
  getJalaliMonthKey,
  nextJalaliMonthKey,
  parseJalaliMonthKey,
  previousJalaliMonthKey
} from '../../../utils/dateRange'
import { formatPersianNumber } from '../../../utils/formatMoney'
import { diffIsoDays, getTodayIso, isoToJalali, JALALI_MONTHS } from '../../../utils/jalaliDate'
import { formatJalaliMonthName } from '../../../utils/periodLabel'
import AppIcon from '../../AppIcon'
import CalmBlock from '../../CalmBlock'
import DueItemRow from '../../DueItemRow'
import PeriodStepper from '../../PeriodStepper'
import { InstallmentCardListSkeleton } from '../../skeleton'
import { calmEmptyClass, calmListClass } from '../../ui/calmListStyles'
import Card from '../../ui/Card'
import { ReportStaticMetaBar } from '../ReportDateFilterBar'

const exportRowClass = cx(
  'focus-ring-inset flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-xl border border-border',
  'bg-surface px-3 py-2 text-start text-text disabled:cursor-default disabled:opacity-50'
)

/** One column on phones; on desktop the month sits beside its list. */
const layoutClass =
  'grid gap-3 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:gap-6'

function monthLabelOf(monthKey: string): string {
  const parts = parseJalaliMonthKey(monthKey)

  return parts ? formatJalaliMonthName(parts.year, parts.month) : monthKey
}

/** «۵ مهر»: the selected day in the list title. */
function dayLabelOf(day: string): string {
  const { day: dayOfMonth, month } = isoToJalali(day)

  return `${formatPersianNumber(dayOfMonth)} ${JALALI_MONTHS[month - 1] ?? ''}`
}

/**
 * «تقویم» view of the due-dates report: month grid, the list of the shown month
 * (or of the tapped day), and the phone-calendar (ICS) export.
 */
export default function DueCalendarView() {
  const { items, loading, reload, exportIcs } = useDueCalendarItems()
  const today = getTodayIso()
  const [monthKey, setMonthKey] = useState(() => getJalaliMonthKey(today))
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const summaries = useMemo(() => summarizeDueDays(items, today), [items, today])
  const monthLabel = monthLabelOf(monthKey)

  const listItems = useMemo(() => {
    const inMonth = dueItemsInMonth(items, monthKey)

    return orderDashboardReminders(
      selectedDay ? inMonth.filter(item => item.dueDate.slice(0, 10) === selectedDay) : inMonth
    )
  }, [items, monthKey, selectedDay])

  const changeMonth = (key: string) => {
    setMonthKey(key)
    setSelectedDay(null)
  }

  if (loading && !items.length) return <InstallmentCardListSkeleton count={4} />

  return (
    <>
      <ReportStaticMetaBar
        subtitle="موارد معوق و ۱۲ ماه آینده"
        onRefresh={reload}
        loading={loading}
      />

      <div className={layoutClass}>
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex justify-center">
            <PeriodStepper
              label={monthLabel}
              onPrevious={() => changeMonth(previousJalaliMonthKey(monthKey))}
              onNext={() => changeMonth(nextJalaliMonthKey(monthKey))}
              previousLabel="ماه قبل"
              nextLabel="ماه بعد"
            />
          </div>

          <Card className="mb-0 p-2">
            <DueCalendarGrid
              monthKey={monthKey}
              monthLabel={monthLabel}
              summaries={summaries}
              selectedDay={selectedDay}
              today={today}
              onSelectDay={day => setSelectedDay(current => (current === day ? null : day))}
              onMonthChange={changeMonth}
            />
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <CalmBlock
            title={selectedDay ? `موارد ${dayLabelOf(selectedDay)}` : `موارد ${monthLabel}`}
            action={
              selectedDay ? { label: 'همهٔ ماه', onClick: () => setSelectedDay(null) } : undefined
            }
          >
            <div aria-live="polite">
              {!listItems.length ? (
                <p className={calmEmptyClass}>
                  {selectedDay ? 'این روز موردی ندارد' : 'این ماه سررسیدی ندارد'}
                </p>
              ) : (
                <ul className={calmListClass}>
                  {listItems.map(item => (
                    <DueItemRow
                      key={item.id}
                      item={item}
                      days={diffIsoDays(today, item.dueDate)}
                      showMonth={false}
                    />
                  ))}
                </ul>
              )}
            </div>
          </CalmBlock>

          <button
            type="button"
            className={exportRowClass}
            onClick={exportIcs}
            disabled={!items.length}
          >
            <AppIcon name="installments" size={20} className="shrink-0 text-primary-dark" />
            <span className="min-w-0 flex-1">
              <span className="block text-[0.84rem] font-semibold">افزودن به تقویم گوشی</span>
              <span className="mt-0.5 block text-[0.7rem] text-muted">
                ۱۲ ماه آینده · یادآور ۱ روز قبل · فایل ICS
              </span>
            </span>
            <AppIcon name="export" size={16} className="shrink-0 text-muted" />
          </button>
        </div>
      </div>
    </>
  )
}
