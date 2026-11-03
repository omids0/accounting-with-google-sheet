import type { ForecastViewId } from './useCashForecast'
import type { ForecastDayState } from '../../services/cashForecast'
import type { ForecastEventKind } from '../../services/cashForecastEvents'
import { formatPersianNumber } from '../../utils/formatMoney'
import { isoToJalali, JALALI_MONTHS } from '../../utils/jalaliDate'

/** «۲۴ آبان». */
export function forecastDayLabel(iso: string): string {
  const { day, month } = isoToJalali(iso)

  return `${formatPersianNumber(day)} ${JALALI_MONTHS[month - 1] ?? ''}`
}

export const EVENT_KIND_LABELS: Record<ForecastEventKind, string> = {
  check: 'چک',
  installment: 'قسط',
  debt: 'بدهی',
  recurring: 'تکرار',
  reminder: 'یادآوری',
  purchase: 'خرید'
}

/** The word a day carries besides its colour, so the state never rests on colour alone. */
export const DAY_STATE_WORDS: Record<ForecastDayState, string> = {
  ok: 'کافی',
  tight: 'تنگ',
  negative: 'کسری'
}

export const VIEW_OPTIONS: { id: ForecastViewId; label: string }[] = [
  { id: 'month', label: 'تا آخر ماه' },
  { id: '30', label: '۳۰ روز' },
  { id: '60', label: '۶۰ روز' }
]

/** «آخر آبان» / «۳۰ روز آینده»: where the end balance is read. */
export function endLabel(view: ForecastViewId, endIso: string): string {
  if (view === 'month') return `آخر ${JALALI_MONTHS[isoToJalali(endIso).month - 1] ?? 'ماه'}`

  return `${formatPersianNumber(Number(view))} روز آینده`
}
