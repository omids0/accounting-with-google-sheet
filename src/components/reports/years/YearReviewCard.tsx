import { useState } from 'react'
import { useNavigate } from 'react-router'

import { closeYearPath } from '../../../routes/paths'
import { reportWords } from '../../../services/reportWording'
import type { YearReview } from '../../../services/yearReview'
import {
  headlineAmount,
  monthName,
  netWorthSpanText,
  percentText,
  yearCountFacts,
  yearKicker,
  yearReviewImage,
  yearTitle
} from '../../../services/yearReviewText'
import { formatJalaliYear } from '../../../utils/dateRange'
import { runExport } from '../../../utils/exportFeedback'
import { saveExportFile } from '../../../utils/saveFile'
import AppIcon from '../../AppIcon'
import MaskedAmount from '../../MaskedAmount'
import Button from '../../ui/Button'
import Card from '../../ui/Card'
import { discoveryRowCloseClass } from '../../ui/dashboardCalmStyles'
import {
  periodReportActionsClass,
  periodReportLinkClass,
  yearCardCellClass,
  yearCardCellValueClass,
  yearCardClass,
  yearCardFactsClass,
  yearCardGridClass,
  yearCardKickerClass,
  yearCardTitleClass
} from '../../ui/periodReportStyles'

function Cell({ label, value, amount }: { label: string; value: string; amount?: boolean }) {
  return (
    <span className={yearCardCellClass}>
      <b className={yearCardCellValueClass} title={amount ? undefined : value}>
        {amount ? <MaskedAmount size="compact">{value}</MaskedAmount> : value}
      </b>
      {label}
    </span>
  )
}

async function shareCard(review: YearReview, ended: boolean): Promise<string | null> {
  const { renderStatCardPng } = await import('../../../utils/statCardPng')
  const blob = await renderStatCardPng(yearReviewImage(review, ended))

  return saveExportFile(`${yearTitle(review.year)}.png`, blob)
}

interface YearReviewCardProps {
  review: YearReview
  /** false from 25 Esfand until Nowruz: «رو به پایان است». */
  ended: boolean
  /** ✕ on the dashboard: closes this year's card for this spreadsheet. */
  onDismiss?: () => void
}

/** «۱۴۰۵ در یک نگاه»: headline numbers, «اشتراک کارت» (PNG) and «بستن سال». */
export default function YearReviewCard({ review, ended, onDismiss }: YearReviewCardProps) {
  const navigate = useNavigate()
  const [sharing, setSharing] = useState(false)
  const span = netWorthSpanText(review)
  const words = reportWords()
  const facts = yearCountFacts(review)

  const share = async () => {
    setSharing(true)
    await runExport(() => shareCard(review, ended), 'ساخت تصویر کارت انجام نشد')
    setSharing(false)
  }

  return (
    <Card className={yearCardClass} role="region" aria-label={yearTitle(review.year)}>
      <div>
        <div className={yearCardKickerClass}>{yearKicker(review.year, ended)}</div>
        <h2 className={yearCardTitleClass}>{yearTitle(review.year)}</h2>
      </div>
      <div className={yearCardGridClass}>
        <Cell label={words.income} value={headlineAmount(review.income)} amount />
        <Cell label={words.expense} value={headlineAmount(review.expense)} amount />
        <Cell
          label={words.savings}
          value={headlineAmount(review.savings, { showPlus: true })}
          amount
        />
        <Cell label="بزرگ‌ترین هزینه" value={review.topExpenseCategory ?? '—'} />
        <Cell label="گران‌ترین ماه" value={monthName(review.topExpenseMonth) ?? '—'} />
        <Cell
          label={words.savingsRate}
          value={review.savingsRate == null ? '—' : percentText(review.savingsRate)}
        />
      </div>
      {span || facts.length ? (
        <p className={yearCardFactsClass}>
          {span ? <MaskedAmount>{span}</MaskedAmount> : null}
          {span && facts.length ? ' · ' : null}
          {facts.join(' · ')}
        </p>
      ) : null}
      <div className={periodReportActionsClass}>
        <Button
          type="button"
          size="sm"
          loading={sharing}
          disabled={sharing}
          onClick={() => void share()}
        >
          اشتراک کارت
        </Button>
        <button
          type="button"
          className={periodReportLinkClass}
          onClick={() => navigate(closeYearPath(review.year))}
        >
          بستن سال
        </button>
        {onDismiss ? (
          <button
            type="button"
            className={discoveryRowCloseClass}
            onClick={onDismiss}
            aria-label={`بستن کارت سال ${formatJalaliYear(review.year)}`}
            title="بستن"
          >
            <AppIcon name="close" size={16} />
          </button>
        ) : null}
      </div>
    </Card>
  )
}
