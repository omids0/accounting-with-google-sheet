import { useNavigate } from 'react-router'

import { getPathForTab } from '../../routes/paths'
import { chargeMonthSummary } from '../../services/buildingSummary'
import type { Receivable } from '../../types'
import { toPersianDigits } from '../../utils/normalizeDigits'
import CalmBlock from '../CalmBlock'
import MoneyText from '../MoneyText'
import ProgressBar from '../ProgressBar'
import {
  calmRowClass,
  calmRowEndClass,
  calmRowMainClass,
  calmRowSubClass,
  calmRowSubDangerClass,
  calmRowTitleClass
} from '../ui/calmListStyles'

const fa = (value: number) => toPersianDigits(String(value))

interface BuildingChargeBlockProps {
  receivables: Receivable[]
  monthKey: string
  monthName: string
  className?: string
}

/** One line for the latest issued month: how many units paid, what is left, a progress bar. */
export default function BuildingChargeBlock({
  receivables,
  monthKey,
  monthName,
  className
}: BuildingChargeBlockProps) {
  const navigate = useNavigate()
  const month = chargeMonthSummary(receivables, monthKey)

  const left = month.billed - month.collected

  const percent = month.billed > 0 ? Math.round((month.collected / month.billed) * 100) : 0

  return (
    <CalmBlock className={className} title="شارژ ماهانه">
      <button
        type="button"
        className={`${calmRowClass} w-full cursor-pointer flex-wrap bg-transparent text-start`}
        onClick={() => navigate(`${getPathForTab('building-units')}?f=debt`)}
      >
        <span className={calmRowMainClass}>
          <span className={calmRowTitleClass}>شارژ {monthName}</span>
          <span className={calmRowSubClass}>
            {fa(month.paid)} از {fa(month.issued)} واحد پرداخت کرده‌اند
          </span>
        </span>
        {left > 0 ? (
          <span className={`${calmRowEndClass} ${calmRowSubDangerClass}`}>
            {fa(month.issued - month.paid)} واحد · <MoneyText amount={left} /> مانده
          </span>
        ) : (
          <span className={calmRowEndClass}>همه پرداخت کرده‌اند ✓</span>
        )}
        <span className="basis-full">
          <ProgressBar
            value={percent}
            showLabel={false}
            shimmer={false}
            variant={left > 0 ? 'default' : 'complete'}
            aria-label={`وصول شارژ ${monthName}`}
          />
        </span>
      </button>
    </CalmBlock>
  )
}
