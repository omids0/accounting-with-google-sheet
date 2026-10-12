import { cn } from '../../utils/cn'
import { formatSignedNumber } from '../../utils/formatMoney'
import AnimatedMoneyDisplay from '../AnimatedMoneyDisplay'
import CardEditButton from '../CardEditButton'
import HelpHint from '../HelpHint'
import { HELP_HINTS } from '../helpHints'
import Card from '../ui/Card'
import {
  dashboardHeroCardAnimatedClass,
  dashboardHeroCardClass,
  dashboardHeroHeaderClass,
  dashboardHeroLabelClass
} from '../ui/chartStyles'
import {
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
  onConfigure?: () => void
  className?: string
}

/** The one tinted block: «دارایی قابل اتکا» with this period's income / expense / net inside it. */
export default function DashboardHero({
  netAvailable,
  totalIncome,
  totalExpense,
  periodNoun,
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

  return (
    <Card className={cn(dashboardHeroCardClass, dashboardHeroCardAnimatedClass, className)}>
      <div className={dashboardHeroHeaderClass}>
        <div className={dashboardHeroLabelClass}>
          دارایی قابل اتکا
          <HelpHint {...HELP_HINTS.netAvailable} />
        </div>
        {onConfigure && <CardEditButton onClick={onConfigure} ariaLabel="تنظیم دارایی قابل اتکا" />}
      </div>
      <AnimatedMoneyDisplay amount={netAvailable} size="hero" tone="hero" />
      <dl className={dashboardHeroStripClass}>
        {strip.map(item => (
          <div key={item.label} className={dashboardHeroStripItemClass}>
            <dt>{item.label}</dt>
            <dd className={dashboardHeroStripValueClass}>{item.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}
