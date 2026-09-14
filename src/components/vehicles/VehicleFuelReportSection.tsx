import type { MonthlyFuelStats } from '../../types/vehicles'
import { formatJalaliMonthLabel } from '../../utils/dateRange'
import { formatMoney } from '../../utils/formatMoney'
import Card from '../ui/Card'
import { emptyStateClass } from '../ui/displayStyles'

type VehicleFuelReportSectionProps = {
  stats: MonthlyFuelStats[]
}

export default function VehicleFuelReportSection({ stats }: VehicleFuelReportSectionProps) {
  if (!stats.length) {
    return (
      <div className={emptyStateClass}>
        <p>هنوز داده بنزین کافی برای گزارش ماهانه ثبت نشده</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {stats.map(month => (
        <Card key={month.monthKey} className="p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[0.95rem] font-bold">{formatJalaliMonthLabel(month.monthKey)}</h3>
            {month.efficiencyL100km !== null ? (
              <span className="text-[0.8rem] text-muted">
                مصرف:{' '}
                <span className="font-semibold text-foreground" dir="ltr">
                  {month.efficiencyL100km.toLocaleString('fa-IR', { maximumFractionDigits: 2 })}
                </span>{' '}
                L/100km
              </span>
            ) : (
              <span className="text-[0.76rem] text-muted">حداقل ۲ بار بنزین برای محاسبه مصرف</span>
            )}
          </div>

          <div className="mb-3 grid grid-cols-2 gap-2 text-[0.82rem]">
            <div className="rounded-xl bg-muted/20 px-3 py-2">
              <div className="text-muted">مجموع لیتر</div>
              <div className="font-bold" dir="ltr">
                {month.totalLiters.toLocaleString('fa-IR', { maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="rounded-xl bg-muted/20 px-3 py-2">
              <div className="text-muted">مجموع مبلغ</div>
              <div className="font-bold text-expense" dir="ltr">
                {formatMoney(month.totalAmount)}
              </div>
            </div>
          </div>

          {month.byPrice.length ? (
            <div className="flex flex-col gap-2">
              <div className="text-[0.78rem] font-semibold text-muted">تفکیک نرخ بنزین</div>
              {month.byPrice.map(row => (
                <div
                  key={`${month.monthKey}-${row.price}`}
                  className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-[0.8rem]"
                >
                  <span dir="ltr">{row.price.toLocaleString('fa-IR')} تومان/L</span>
                  <span className="text-muted" dir="ltr">
                    {row.liters.toLocaleString('fa-IR', { maximumFractionDigits: 2 })} L ·{' '}
                    {formatMoney(row.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </Card>
      ))}
    </div>
  )
}
