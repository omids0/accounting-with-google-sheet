import type { WalletTraceResult } from '../../../services/walletTraceLoad'
import { cn } from '../../../utils/cn'
import { formatPercentFa } from '../../../utils/insightText'
import MoneyText from '../../MoneyText'
import { calmBarClass, calmBarTrackClass } from '../../ui/calmListStyles'
import Card, { CardTitle } from '../../ui/Card'

const rowClass = 'flex items-baseline justify-between gap-3 py-1 text-[0.82rem]'
const valueClass = 'font-numeric font-bold tabular-nums'

/** Share of the difference the findings account for (0..1). */
export function coverageOf(difference: number, remainder: number): number {
  if (!difference) return 1

  return Math.min(1, Math.max(0, 1 - Math.abs(remainder) / Math.abs(difference)))
}

function verdictOf(difference: number, remainder: number, findings: number): string {
  if (Math.abs(difference) < 1) {
    return findings
      ? 'کیف پول و مانده محاسبه‌شده یکی‌اند؛ ولی چند مورد زیر همدیگر را خنثی کرده‌اند.'
      : 'اختلافی نیست؛ کیف پول و مانده محاسبه‌شده یکی‌اند.'
  }
  if (Math.abs(remainder) < 1) return 'همهٔ اختلاف توضیح داده شد.'
  if (!findings) return 'در داده‌ها ردی از علت پیدا نشد.'

  const share = Math.round(coverageOf(difference, remainder) * 100)

  return `${formatPercentFa(share)} از اختلاف توضیح داده شد.`
}

/** The figure the wallet page shows, how much of it the tracer explains, and what is left. */
export default function TraceSummary({ result }: { result: WalletTraceResult }) {
  const { report, monthLabel, walletTotal, periodBalance } = result
  const { difference, remainder, findings } = report
  const coverage = coverageOf(difference, remainder)
  const settled = Math.abs(remainder) < 1

  return (
    <Card className="mb-0">
      <CardTitle>اختلاف کیف پول · {monthLabel}</CardTitle>
      <div className={rowClass}>
        <span>موجودی کیف پول</span>
        <span className={valueClass}>
          <MoneyText amount={walletTotal} />
        </span>
      </div>
      <div className={rowClass}>
        <span>مانده محاسبه‌شده</span>
        <span className={valueClass}>
          <MoneyText amount={periodBalance} />
        </span>
      </div>
      <div className={cn(rowClass, difference ? 'text-danger' : 'text-success')} aria-live="polite">
        <span>اختلاف</span>
        <span className={valueClass}>
          <MoneyText amount={difference} signed="plus" />
        </span>
      </div>
      {difference ? (
        <>
          <div
            className={calmBarTrackClass}
            role="img"
            aria-label={`${formatPercentFa(Math.round(coverage * 100))} اختلاف توضیح داده شده`}
          >
            <div
              className={cn(calmBarClass, settled ? 'bg-success' : 'bg-primary')}
              style={{ transform: `scaleX(${coverage})` }}
            />
          </div>
          <p className="m-0 mt-2 text-[0.78rem] leading-[1.7] text-muted">
            {verdictOf(difference, remainder, findings.length)}
          </p>
        </>
      ) : (
        <p className="m-0 mt-1 text-[0.78rem] leading-[1.7] text-muted">
          {verdictOf(difference, remainder, findings.length)}
        </p>
      )}
    </Card>
  )
}
