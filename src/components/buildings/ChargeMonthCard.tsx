import type { ChargeMonthCardData } from '../../services/buildingChargeMonths'
import { monthLabel } from '../../services/buildingMonths'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import { toPersianDigits } from '../../utils/normalizeDigits'
import MoneyText from '../MoneyText'
import ProgressBar from '../ProgressBar'
import Card from '../ui/Card'

const fa = (value: number) => toPersianDigits(String(value))

/** One issued month: «مهر ۱۴۰۵ · صادر شده … · ۱۲ واحد · سررسید …», billed, progress, who is left. */
export default function ChargeMonthCard({
  month,
  onOpen
}: {
  month: ChargeMonthCardData
  onOpen: (monthKey: string) => void
}) {
  const percent = month.billed > 0 ? Math.round((month.collected / month.billed) * 100) : 0

  const label = monthLabel(month.monthKey)

  return (
    <Card className="p-0">
      <button
        type="button"
        className="flex w-full cursor-pointer flex-col gap-1 rounded-[inherit] border-0 bg-transparent p-card text-start font-[inherit] text-text"
        onClick={() => onOpen(month.monthKey)}
        aria-label={`شارژ ${label}`}
      >
        <b className="text-[0.95rem]">{label}</b>
        <span className="text-sm text-muted">
          {month.issuedAt ? `صادر شده ${formatIsoDatePersian(month.issuedAt)} · ` : ''}
          {fa(month.units)} واحد · سررسید {formatIsoDatePersian(month.due)}
        </span>
        <span className="mt-1 flex items-center justify-between text-sm">
          <span>صادر شده</span>
          <b>
            <MoneyText amount={month.billed} />
          </b>
        </span>
        <ProgressBar
          value={percent}
          showLabel={false}
          shimmer={false}
          variant={month.openUnits ? 'default' : 'complete'}
          aria-label={`وصول شارژ ${label}`}
        />
        <span className="text-sm text-muted">
          وصول <MoneyText amount={month.collected} /> ·{' '}
          {month.openUnits ? `${fa(month.openUnits)} واحد مانده` : 'همه پرداخت کرده‌اند ✓'}
          {month.partialUnits ? ` · ${fa(month.partialUnits)} ناقص` : ''}
        </span>
      </button>
    </Card>
  )
}
