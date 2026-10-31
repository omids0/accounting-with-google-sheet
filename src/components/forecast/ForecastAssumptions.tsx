import { EVENT_KIND_LABELS, forecastDayLabel } from './forecastLabels'
import ForecastMoney from './ForecastMoney'
import type { ForecastResult } from '../../services/cashForecast'
import type { ForecastEvent, ForecastLeftOut } from '../../services/cashForecastEvents'
import type { SpendingAverage } from '../../services/cashForecastSpending'
import { formatPersianNumber } from '../../utils/formatMoney'
import CalmBlock from '../CalmBlock'

const itemClass = 'leading-[1.8]'

/** «۲ چک، ۱ قسط»: how many events of each kind the estimate counted. */
function countsText(events: ForecastEvent[]): string {
  const counts = new Map<string, number>()

  for (const event of events) {
    counts.set(event.kind, (counts.get(event.kind) ?? 0) + 1)
  }

  return [...counts]
    .map(
      ([kind, count]) =>
        `${formatPersianNumber(count)} ${EVENT_KIND_LABELS[kind as ForecastEvent['kind']]}`
    )
    .join('، ')
}

/**
 * «فرض‌های این برآورد»: what was counted, what was assumed, and what is known but left out, so
 * nobody has to guess why the number is what it is.
 */
export default function ForecastAssumptions({
  forecast,
  events,
  leftOut,
  dailySpending,
  spending,
  failed
}: {
  forecast: ForecastResult
  events: ForecastEvent[]
  leftOut: ForecastLeftOut[]
  dailySpending: number
  spending: SpendingAverage
  failed: string[]
}) {
  const late = events.filter(event => event.late)
  const counted = events.filter(event => !forecast.skippedEvents.includes(event))

  return (
    <CalmBlock title="فرض‌های این برآورد">
      <ul className="m-0 flex list-disc flex-col gap-1 ps-5 text-[0.78rem] text-muted">
        <li className={itemClass}>
          {counted.length
            ? `سررسیدهای شناخته‌شده سر تاریخشان حساب شده‌اند: ${countsText(counted)}.`
            : 'سررسید شناخته‌شده‌ای در این بازه نیست.'}{' '}
          فرض بر این است که چک‌ها و اقساط سر موعد پرداخت یا وصول می‌شوند.
        </li>
        <li className={itemClass}>
          {dailySpending > 0 ? (
            <>
              خرج روزانهٔ <ForecastMoney amount={dailySpending} /> از فردا هر روز کم می‌شود؛ این رقم
              حدس است، نه چیزی که ثبت شده باشد.
            </>
          ) : (
            'خرج روزانه صفر است؛ پس خرج‌های معمول زندگی در این برآورد نیست.'
          )}
        </li>
        <li className={itemClass}>
          {spending.enough ? (
            <>
              میانگین ۳ ماه اخیر از {formatPersianNumber(spending.counted)} هزینهٔ ثبت‌شده در{' '}
              {formatPersianNumber(spending.historyDays)} روز حساب شده. هزینه‌هایی که به قسط، چک یا
              بدهی وصل‌اند ({formatPersianNumber(spending.excludedLinked)} مورد) و هزینه‌هایی که
              تکرار ماهانه ثبت کرده یا با عنوان و دستهٔ یک تکرار فعال یکی‌اند (
              {formatPersianNumber(spending.excludedRecurring)} مورد) کنار گذاشته شده‌اند، چون
              خودشان جدا در برآورد هستند. تشخیص تکراری از روی عنوان و دسته است و ممکن است دقیق
              نباشد.
            </>
          ) : (
            'سابقهٔ هزینه کمتر از ۱۴ روز است؛ میانگینی حساب نشده و خرج روزانه را خودتان تعیین می‌کنید.'
          )}
        </li>
        {late.length ? (
          <li className={itemClass}>
            {formatPersianNumber(late.length)} مورد موعدش گذشته و هنوز پرداخت نشده؛ برای امروز حساب
            شد.
          </li>
        ) : null}
        {forecast.skippedEvents.length ? (
          <li className={itemClass}>
            {formatPersianNumber(forecast.skippedEvents.length)} تکرار به حساب‌های بیرون از برآورد
            وصل است و حساب نشد.
          </li>
        ) : null}
        {leftOut.map(item => (
          <li key={item.id} className={itemClass}>
            حساب نشد: <bdi>{item.title}</bdi> <ForecastMoney amount={item.amount} /> (
            <bdi>{forecastDayLabel(item.date)}</bdi>)؛ {item.reason}.
          </li>
        ))}
        <li className={itemClass}>
          طلب‌ها تاریخ سررسید ندارند و یادآوری‌های خودرو هنوز وارد برآورد نمی‌شوند؛ این دو حساب
          نشده‌اند.
        </li>
        {failed.length ? (
          <li className={`${itemClass} text-warning`}>
            خواندن این بخش‌ها نشد و برآورد بدون آن‌هاست: {failed.join('، ')}.
          </li>
        ) : null}
      </ul>
    </CalmBlock>
  )
}
