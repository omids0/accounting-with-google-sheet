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
  breakdown
}: {
  monthName: string
  breakdown: ExpenseBreakdown
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
    </Card>
  )
}
