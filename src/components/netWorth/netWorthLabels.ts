import type { NetWorthPoint } from '../../services/netWorthTrend'
import { parseJalaliMonthKey } from '../../utils/dateRange'
import { JALALI_MONTHS } from '../../utils/jalaliDate'
import { formatJalaliMonthName } from '../../utils/periodLabel'

/** «مهر ۱۴۰۵». */
export function netWorthMonthTitle(monthKey: string): string {
  const parts = parseJalaliMonthKey(monthKey)

  return parts ? formatJalaliMonthName(parts.year, parts.month) : monthKey
}

/** «مهر». */
export function netWorthMonthName(monthKey: string): string {
  const parts = parseJalaliMonthKey(monthKey)

  return parts ? JALALI_MONTHS[parts.month - 1] ?? monthKey : monthKey
}

const SOURCE_LABELS: Record<NetWorthPoint['source'], string> = {
  live: 'امروز',
  auto: 'ثبت خودکار',
  rebuilt: 'بازسازی از رکوردها',
  manual: 'ویرایش دستی'
}

export function netWorthSourceLabel(source: NetWorthPoint['source']): string {
  return SOURCE_LABELS[source]
}
