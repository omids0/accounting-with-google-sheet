import { useState } from 'react'
import { useNavigate } from 'react-router'

import FilterChipBar from './FilterChipBar'
import ReportAssemblyCard from './ReportAssemblyCard'
import { ReportDebts, ReportDebtors, ReportFundTrend } from './ReportDebtBlocks'
import { SpendingByCategory, SpendingByKind } from './ReportSpendingBlocks'
import { useBuildingReport } from './useBuildingReport'
import { getPathForTab } from '../../routes/paths'
import {
  collectionFlow,
  defaultPeriodValue,
  periodChoices,
  type ReportMode,
  type ReportPeriod
} from '../../services/buildingReports'
import { isConfigured } from '../../services/settings'
import { formatPersianNumber } from '../../utils/formatMoney'
import { getTodayIso, isoToJalali } from '../../utils/jalaliDate'
import CalmBlock from '../CalmBlock'
import MonthlyFlowChartSection from '../charts/MonthlyFlowChartSection'
import EmptyState from '../EmptyState'
import Select from '../form/Select'
import MoneyText from '../MoneyText'
import { calmListClass, calmRowClass, calmRowTitleClass } from '../ui/calmListStyles'
import Card from '../ui/Card'
import { chartTitleClass } from '../ui/chartStyles'
import { listModulePageClass } from '../ui/featureCardStyles'
import {
  periodReportStatClass,
  periodReportStatsClass,
  periodReportStatValueClass
} from '../ui/periodReportStyles'

const COLLECTED_VS_BILLED = {
  first: 'وصول',
  second: 'صدور',
  net: 'وصول − صدور',
  secondColor: 'var(--color-muted)'
}

function Stat({ label, amount }: { label: string; amount: number }) {
  return (
    <div className={periodReportStatClass}>
      <span className={periodReportStatValueClass}>
        <MoneyText amount={amount} />
      </span>
      {label}
    </div>
  )
}

/** The reports a building keeps besides this page; each one is the app's own report. */
const OTHER_REPORTS = [
  { tab: 'report-monthly' as const, label: 'گزارش ماهانه' },
  { tab: 'report-years' as const, label: 'سال در یک نگاه' },
  { tab: 'search' as const, label: 'جستجو در واحدها، ساکنان و رکوردها' }
]

/**
 * «گزارش‌ها و مجمع»: billed against collected per month, the spending by category and kind, the
 * debtor table, the fund's trend and what the building owes, for a year, six months or a month.
 * «گزارش مجمع» turns the same tables into a PDF or CSV for the owners' meeting. Transfers and fund
 * corrections are in none of the numbers, and unit credit is never counted as a debt.
 */
export default function BuildingReportsPage() {
  const navigate = useNavigate()
  const todayIso = getTodayIso()
  const [period, setPeriod] = useState<ReportPeriod>(() => ({
    mode: 'year',
    value: String(isoToJalali(todayIso).year)
  }))
  const { report } = useBuildingReport(period)

  if (!isConfigured()) return <EmptyState icon="chart" message="ابتدا با گوگل وارد شوید" />

  const changeMode = (mode: ReportMode) =>
    setPeriod({ mode, value: defaultPeriodValue(mode, todayIso) })

  const choices = periodChoices(period.mode, todayIso)

  return (
    <div className={listModulePageClass}>
      <div className="flex flex-wrap items-center gap-2">
        <FilterChipBar<ReportMode>
          ariaLabel="بازهٔ گزارش"
          value={period.mode}
          onChange={changeMode}
          options={[
            { value: 'year', label: 'سال' },
            { value: 'six', label: '۶ ماه' },
            { value: 'month', label: 'ماه' }
          ]}
        />
        {choices.length ? (
          <Select
            compact
            aria-label={period.mode === 'year' ? 'سال' : 'ماه'}
            value={period.value}
            options={choices}
            onChange={value => setPeriod({ mode: period.mode, value })}
          />
        ) : null}
      </div>

      {report ? (
        <>
          <Card>
            <div className={periodReportStatsClass}>
              <Stat label="وصول" amount={report.flow.income} />
              <Stat label="هزینه" amount={report.flow.expense} />
              <Stat label="موجودی صندوق" amount={report.fund.total} />
            </div>
          </Card>

          <MonthlyFlowChartSection
            data={collectionFlow(report.collection)}
            labels={COLLECTED_VS_BILLED}
            header={
              <h3 className={chartTitleClass}>
                صدور در برابر وصول
                {report.rate === null ? '' : ` · میانگین وصول ${formatPersianNumber(report.rate)}٪`}
              </h3>
            }
          />

          <div className="grid gap-4 md:grid-cols-2">
            <SpendingByCategory flow={report.flow} />
            <SpendingByKind flow={report.flow} />
            <ReportDebtors
              debtors={report.debtors}
              onOpenUnit={unitId => navigate(getPathForTab('building-unit', { unitId }))}
            />
            <ReportFundTrend fund={report.fund} />
            <ReportDebts debts={report.debts} />
          </div>

          <ReportAssemblyCard report={report} />
        </>
      ) : (
        <EmptyState icon="chart" message="در حال آماده‌سازی گزارش…" />
      )}

      <CalmBlock title="گزارش‌های دیگر">
        <ul className={calmListClass}>
          {OTHER_REPORTS.map(item => (
            <li key={item.tab} className={calmRowClass}>
              <button
                type="button"
                className={`${calmRowTitleClass} min-h-9 flex-1 cursor-pointer border-none bg-transparent p-0 text-start`}
                onClick={() => navigate(getPathForTab(item.tab))}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </CalmBlock>
    </div>
  )
}
