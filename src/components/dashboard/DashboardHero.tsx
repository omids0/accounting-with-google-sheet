import { compareMonths } from '../../services/monthComparison'
import type { PreviousMonthSummary } from '../../types'
import { cn } from '../../utils/cn'
import { formatSignedNumber } from '../../utils/formatMoney'
import { heroExpenseComparisonText } from '../../utils/insightText'
import { unquotedHeroNote } from '../../utils/vaultUnquotedText'
import AnimatedMoneyDisplay from '../AnimatedMoneyDisplay'
import CardEditButton from '../CardEditButton'
import HelpHint from '../HelpHint'
import { HELP_HINTS } from '../helpHints'
import MaskedAmount from '../MaskedAmount'
import Card from '../ui/Card'
import {
  dashboardHeroCardAnimatedClass,
  dashboardHeroCardClass,
  dashboardHeroHeaderClass,
  dashboardHeroLabelClass
} from '../ui/chartStyles'
import {
  dashboardHeroCompareClass,
  dashboardHeroStripClass,
  dashboardHeroStripItemClass,
  dashboardHeroStripValueClass
} from '../ui/dashboardCalmStyles'

export interface DashboardHeroProps {
  netAvailable: number
  totalIncome: number
  totalExpense: number
  /** «ماه», «سال» or «دوره» — names the period in the strip labels. */
  periodNoun: string
  /** Set for a month period: «هزینه ماه ۱۲٪ کمتر از شهریور». */
  previousMonth?: PreviousMonthSummary
  /** «تا پایان مهر ۱۴۰۵» — set when the period has ended and the wallet is its closing balance. */
  asOfLabel?: string
  /** Live-priced vault assets with no quote: left out of the value, so the hero says so. */
  unquotedAssets?: string[]
  onConfigure?: () => void
  className?: string
}

/** The one tinted block: «دارایی قابل اتکا» with this period's income / expense / net inside it. */
export default function DashboardHero({
  netAvailable,
  totalIncome,
  totalExpense,
  periodNoun,
  previousMonth,
  asOfLabel,
  unquotedAssets,
  onConfigure,
  className
}: DashboardHeroProps) {
  const strip = [
    { label: `درآمد ${periodNoun}`, value: formatSignedNumber(totalIncome, { showPlus: true }) },
    { label: `هزینه ${periodNoun}`, value: formatSignedNumber(-totalExpense) },
    {
      label: 'خالص',
      value: formatSignedNumber(totalIncome - totalExpense, { showPlus: true })
    }
  ]

  const unquotedNote = unquotedHeroNote(unquotedAssets)

  const expenseComparison = previousMonth
    ? compareMonths(totalExpense, previousMonth.totalExpense)
    : null

  return (
    <Card className={cn(dashboardHeroCardClass, dashboardHeroCardAnimatedClass, className)}>
      <div className={dashboardHeroHeaderClass}>
        <div className={dashboardHeroLabelClass}>
          {asOfLabel ? `دارایی قابل اتکا · ${asOfLabel}` : 'دارایی قابل اتکا'}
          <HelpHint {...HELP_HINTS.netAvailable} />
        </div>
        {onConfigure && (
          <CardEditButton onClick={onConfigure} label="تنظیم" itemLabel="دارایی قابل اتکا" />
        )}
      </div>
      <AnimatedMoneyDisplay amount={netAvailable} size="hero" tone="hero" />
      {unquotedNote && <p className={dashboardHeroCompareClass}>{unquotedNote}</p>}
      <dl className={dashboardHeroStripClass}>
        {strip.map(item => (
          <div key={item.label} className={dashboardHeroStripItemClass}>
            <dt>{item.label}</dt>
            <dd className={dashboardHeroStripValueClass}>
              <MaskedAmount>{item.value}</MaskedAmount>
            </dd>
          </div>
        ))}
      </dl>
      {expenseComparison && previousMonth ? (
        <p className={dashboardHeroCompareClass}>
          {heroExpenseComparisonText(expenseComparison, previousMonth.monthName, periodNoun)}
        </p>
      ) : null}
    </Card>
  )
}
