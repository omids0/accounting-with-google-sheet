import type { WalletTraceResult } from '../../../services/walletTraceLoad'
import type { TraceReport } from '../../../services/walletTraceTypes'
import { cn } from '../../../utils/cn'
import { formatPercentFa } from '../../../utils/insightText'
import MoneyText from '../../MoneyText'
import Button from '../../ui/Button'
import { calmBarClass, calmBarTrackClass } from '../../ui/calmListStyles'
import Card, { CardTitle } from '../../ui/Card'

const rowClass = 'flex items-baseline justify-between gap-3 py-1 text-[0.82rem]'
const valueClass = 'font-numeric font-bold tabular-nums'
const noteClass = 'm-0 mt-2 text-[0.8rem] leading-[1.8] text-muted'

/** Share of the difference the findings account for (0..1). */
export function coverageOf(difference: number, remainder: number): number {
  if (!difference) return 1

  return Math.min(1, Math.max(0, 1 - Math.abs(remainder) / Math.abs(difference)))
}

/** The found items add up to more than the gap: some of them cancel each other. */
export function isOvershoot(difference: number, remainder: number): boolean {
  return Math.abs(remainder) > Math.abs(difference) + 0.5
}

function verdictOf(report: TraceReport): string {
  const { difference, remainder, findings } = report

  if (Math.abs(difference) < 1) {
    return findings.length
      ? 'کیف پول و مانده محاسبه‌شده یکی‌اند؛ ولی چند مورد زیر همدیگر را خنثی کرده‌اند.'
      : 'اختلافی نیست؛ کیف پول و مانده محاسبه‌شده یکی‌اند.'
  }
  if (report.story?.exact) {
    return 'زمان شروع اختلاف پیدا شد؛ پایین‌تر «اختلاف از کجا آمد؟» را بخوان.'
  }
  if (!findings.length) return 'در داده‌ها نشانی از علت پیدا نشد.'
  if (isOvershoot(difference, remainder)) {
    return 'موردهای پیداشده روی هم از اختلاف بیشترند، چون بعضی‌شان همدیگر را خنثی می‌کنند. همه را نگاه کن.'
  }

  const guesses = findings.some(item => item.certainty === 'likely')
  const share = formatPercentFa(Math.round(coverageOf(difference, remainder) * 100))

  if (Math.abs(remainder) < 1) {
    return guesses
      ? 'موردهای پیداشده همهٔ اختلاف را می‌سازند؛ بعضی‌شان حدسی‌اند و باید خودت نگاهشان کنی.'
      : 'موردهای پیداشده همهٔ اختلاف را می‌سازند.'
  }

  return `موردهای پیداشده ${share} اختلاف را می‌سازند${
    guesses ? '؛ بعضی‌شان حدسی‌اند و باید خودت نگاهشان کنی' : ''
  }.`
}

/** The figure the wallet page shows, how much the tracer found, and what to do next. */
export default function TraceSummary({ result }: { result: WalletTraceResult }) {
  const { report, monthLabel, walletTotal, periodBalance } = result
  const { difference, remainder } = report
  const coverage = coverageOf(difference, remainder)
  const settled = Math.abs(remainder) < 1 && !isOvershoot(difference, remainder)

  return (
    <Card className="mb-0">
      <CardTitle>اختلاف کیف پول · {monthLabel}</CardTitle>
      <div className={rowClass}>
        <span>موجودی واقعی حساب‌ها</span>
        <span className={valueClass}>
          <MoneyText amount={walletTotal} />
        </span>
      </div>
      <div className={rowClass}>
        <span>مانده محاسبه‌شده از رکوردها</span>
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
      <p className="m-0 text-[0.74rem] leading-[1.8] text-muted">
        مانده محاسبه‌شده = موجودی اول دوره + درآمدها − هزینه‌هایی که ثبت کرده‌ای.
        {difference
          ? ` ${
              difference > 0
                ? 'یعنی پول حساب‌ها بیشتر از چیزی است که رکوردها نشان می‌دهند.'
                : 'یعنی پول حساب‌ها کمتر از چیزی است که رکوردها نشان می‌دهند.'
            }`
          : ''}
      </p>
      {difference ? (
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
      ) : null}
      <p className={noteClass}>{verdictOf(report)}</p>
      {difference ? (
        <>
          {report.story?.exact ? null : (
            <p className={noteClass}>
              از بزرگ‌ترین مورد شروع کن و هر مورد را لمس کن تا دلیل و کارش را ببینی. عدد کنار هر
              مورد یعنی چقدر به اختلاف اضافه (+) یا از آن کم (−) می‌کند.
            </p>
          )}
          {report.story?.exact ? null : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-2 min-h-11"
              onClick={() =>
                document.getElementById('trace-remainder')?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              نمی‌خواهم دنبالش بگردم
            </Button>
          )}
        </>
      ) : null}
    </Card>
  )
}
