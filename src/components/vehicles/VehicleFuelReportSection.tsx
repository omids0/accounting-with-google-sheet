import {
  fuelEntryCardClass,
  fuelEntryDateBadgeClass,
  fuelEntryListClass,
  fuelEntryStatBoxClass,
  fuelEntryStatLabelClass,
  fuelEntryStatsGridClass,
  fuelEntryStatValueClass,
  fuelPriceCardClass,
  fuelPriceCardMetaRowClass,
  fuelPriceCardRateClass,
  fuelPriceCardsGridClass,
  fuelReportSectionAccentClass,
  fuelReportSectionTitleClass
} from './vehicleCardStyles'
import type { MonthlyFuelStats } from '../../types/vehicles'
import { formatJalaliMonthLabel } from '../../utils/dateRange'
import { formatMoney } from '../../utils/formatMoney'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import Card from '../ui/Card'
import { emptyStateClass } from '../ui/displayStyles'

type VehicleFuelReportSectionProps = {
  stats: MonthlyFuelStats[]
}

function FuelPriceBreakdown({ month }: { month: MonthlyFuelStats }) {
  if (!month.byPrice.length) return null

  return (
    <div className="mb-4">
      <div className={fuelReportSectionTitleClass}>
        <span className={fuelReportSectionAccentClass} aria-hidden />
        <span>تفکیک نرخ بنزین</span>
      </div>
      <div className={fuelPriceCardsGridClass}>
        {month.byPrice.map(row => (
          <div key={`${month.monthKey}-${row.price}`} className={fuelPriceCardClass}>
            <div className="text-[0.72rem] font-semibold text-expense/80">نرخ هر لیتر</div>
            <div className={fuelPriceCardRateClass} dir="ltr">
              {row.price.toLocaleString('fa-IR')}
              <span className="ms-1 text-[0.72rem] font-medium text-muted">تومان/L</span>
            </div>
            <div className={fuelPriceCardMetaRowClass}>
              <span className="text-muted">حجم</span>
              <span className="font-semibold" dir="ltr">
                {row.liters.toLocaleString('fa-IR', { maximumFractionDigits: 2 })} L
              </span>
            </div>
            <div className={fuelPriceCardMetaRowClass}>
              <span className="text-muted">مبلغ</span>
              <span className="font-bold text-expense" dir="ltr">
                {formatMoney(row.amount)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function FuelEntryList({ month }: { month: MonthlyFuelStats }) {
  if (!month.entries.length) return null

  return (
    <div>
      <div className={fuelReportSectionTitleClass}>
        <span className={fuelReportSectionAccentClass} aria-hidden />
        <span>سوابق بنزین</span>
      </div>
      <div className={fuelEntryListClass}>
        {month.entries.map(entry => (
          <div
            key={`${month.monthKey}-${entry.date}-${entry.mileage ?? 0}-${entry.amount}`}
            className={fuelEntryCardClass}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={fuelEntryDateBadgeClass}>
                {entry.date ? formatIsoDatePersian(entry.date) : '—'}
              </span>
              {entry.mileage ? (
                <span className="text-[0.72rem] text-muted" dir="ltr">
                  کارکرد {entry.mileage.toLocaleString('fa-IR')} km
                </span>
              ) : null}
            </div>
            <div className={fuelEntryStatsGridClass}>
              <div className={fuelEntryStatBoxClass}>
                <div className={fuelEntryStatLabelClass}>لیتر</div>
                <div className={fuelEntryStatValueClass} dir="ltr">
                  {entry.liters.toLocaleString('fa-IR', { maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className={fuelEntryStatBoxClass}>
                <div className={fuelEntryStatLabelClass}>نرخ</div>
                <div className={fuelEntryStatValueClass} dir="ltr">
                  {entry.price > 0 ? entry.price.toLocaleString('fa-IR') : '—'}
                </div>
              </div>
              <div className={fuelEntryStatBoxClass}>
                <div className={fuelEntryStatLabelClass}>مبلغ</div>
                <div className={`${fuelEntryStatValueClass} text-expense`} dir="ltr">
                  {formatMoney(entry.amount)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
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

          <div className="mb-4 grid grid-cols-2 gap-2 text-[0.82rem]">
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

          <FuelPriceBreakdown month={month} />
          <FuelEntryList month={month} />
        </Card>
      ))}
    </div>
  )
}
