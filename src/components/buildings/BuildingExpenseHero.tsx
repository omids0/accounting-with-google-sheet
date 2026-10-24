import type { ExpenseBreakdown } from '../../services/buildingExpenseMeta'
import AnimatedMoneyDisplay from '../AnimatedMoneyDisplay'
import MoneyText from '../MoneyText'
import Card from '../ui/Card'
import {
  dashboardHeroCardAnimatedClass,
  dashboardHeroCardClass,
  dashboardHeroHeaderClass,
  dashboardHeroLabelClass
} from '../ui/chartStyles'
import { dashboardHeroCompareClass } from '../ui/dashboardCalmStyles'

function Parts({ parts }: { parts: ExpenseBreakdown['byKind'] }) {
  return (
    <>
      {parts.map((part, index) => (
        <span key={part.value}>
          {index ? ' · ' : ''}
          {part.label} <MoneyText amount={part.amount} />
        </span>
      ))}
    </>
  )
}

/** The expenses page hero: the month's total, split by kind and by who paid. */
export default function BuildingExpenseHero({
  monthName,
  breakdown,
  excluded = 0,
  open = false,
  onToggle,
  panelId
}: {
  monthName: string
  breakdown: ExpenseBreakdown
  /** The month's transfers, corrections and reconciles: not counted in the total, shown apart. */
  excluded?: number
  /** The line is the toggle of the section that lists them (`panelId`). */
  open?: boolean
  onToggle?: () => void
  panelId?: string
}) {
  return (
    <Card className={`${dashboardHeroCardClass} ${dashboardHeroCardAnimatedClass}`}>
      <div className={dashboardHeroHeaderClass}>
        <div className={dashboardHeroLabelClass}>{`هزینهٔ ${monthName}`}</div>
      </div>
      <AnimatedMoneyDisplay amount={breakdown.total} size="hero" tone="hero" />
      {breakdown.total > 0 ? (
        <>
          <p className={dashboardHeroCompareClass}>
            <Parts parts={breakdown.byKind} />
          </p>
          <p className={dashboardHeroCompareClass}>
            <Parts parts={breakdown.byPayer} />
          </p>
        </>
      ) : null}
      {excluded > 0 ? (
        <button
          type="button"
          className={`${dashboardHeroCompareClass} min-h-11 text-start underline`}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
        >
          انتقال، اصلاح و تطبیق: <MoneyText amount={excluded} /> (در هزینه حساب نمی‌شود){' '}
          {open ? '▴' : '▾'}
        </button>
      ) : null}
    </Card>
  )
}
