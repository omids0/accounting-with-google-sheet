import { monthlyReportTitle, type MonthlyReportData } from '../../../services/monthlyReport'
import { monthlyReportHighlightLine } from '../../../services/monthlyReportPdf'
import { formatPersianNumber } from '../../../utils/formatMoney'
import MoneyText from '../../MoneyText'
import Card from '../../ui/Card'
import {
  periodReportBudgetClass,
  periodReportFactsClass,
  periodReportFillClass,
  periodReportHeadClass,
  periodReportOwnerClass,
  periodReportSectionClass,
  periodReportSheetClass,
  periodReportStatClass,
  periodReportStatsClass,
  periodReportStatValueClass,
  periodReportTitleClass,
  periodReportTrackClass
} from '../../ui/periodReportStyles'

function Stat({ label, amount, signed }: { label: string; amount: number; signed?: boolean }) {
  return (
    <div className={periodReportStatClass}>
      <span className={periodReportStatValueClass}>
        <MoneyText amount={amount} signed={signed ? 'plus' : false} />
      </span>
      {label}
    </div>
  )
}

/** On-screen copy of the one-page PDF: the same content, amounts masked in hidden mode. */
export default function MonthlyReportPreview({
  report,
  owner
}: {
  report: MonthlyReportData
  owner: string | null
}) {
  const change = report.netWorthChange

  const highlightLine = monthlyReportHighlightLine(report)

  return (
    <Card className={periodReportSheetClass}>
      <div className={periodReportHeadClass}>
        <h2 className={periodReportTitleClass}>{monthlyReportTitle(report.monthKey)}</h2>
        {owner ? <span className={periodReportOwnerClass}>{owner}</span> : null}
      </div>

      <div className={periodReportStatsClass}>
        <Stat label="درآمد" amount={report.income} />
        <Stat label="هزینه" amount={report.expense} />
        <Stat label="خالص" amount={report.net} signed />
      </div>

      {report.budgets.length ? (
        <>
          <h3 className={periodReportSectionClass}>بودجه</h3>
          {report.budgets.map(row => (
            <div key={row.category} className={periodReportBudgetClass(row.over)}>
              <span>
                {row.category} <MoneyText amount={row.spent} /> از <MoneyText amount={row.budget} />
              </span>
              <div className={periodReportTrackClass} aria-hidden="true">
                <div
                  className={periodReportFillClass(row.over)}
                  style={{ width: `${Math.round(Math.min(1, row.ratio) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </>
      ) : null}

      {highlightLine ? <p className={periodReportFactsClass}>{highlightLine}</p> : null}

      <p className={periodReportFactsClass}>
        {`اقساط پرداخت‌شده ${formatPersianNumber(
          report.installments.paid
        )} از ${formatPersianNumber(report.installments.due)} · چک پاس‌شده ${formatPersianNumber(
          report.checksCleared
        )}`}
        {report.netWorth != null ? (
          <>
            {' · دارایی خالص '}
            <MoneyText amount={report.netWorth} />
            {change != null ? (
              <>
                {` (${change >= 0 ? '↑' : '↓'} `}
                <MoneyText amount={Math.abs(change)} />)
              </>
            ) : null}
          </>
        ) : null}
        {` · تکرارهای ثبت‌شده ${formatPersianNumber(report.recurringPosted)}`}
      </p>
    </Card>
  )
}
