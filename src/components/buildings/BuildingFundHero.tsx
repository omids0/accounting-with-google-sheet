import type { MonthFlow } from '../../services/buildingDashboard'
import type { WalletAccount } from '../../types'
import { cn } from '../../utils/cn'
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

interface BuildingFundHeroProps {
  accounts: WalletAccount[]
  flow: MonthFlow
  /** «مهر»: the month the flow line names. */
  monthName: string
  className?: string
}

/**
 * The dashboard's one tinted block: the fund (the sum of the building's wallet accounts), each
 * account on a line, and what came in minus what went out this month.
 */
export default function BuildingFundHero({
  accounts,
  flow,
  monthName,
  className
}: BuildingFundHeroProps) {
  const total = accounts.reduce((sum, account) => sum + account.balance, 0)

  const delta = flow.income - flow.expense

  return (
    <Card className={cn(dashboardHeroCardClass, dashboardHeroCardAnimatedClass, className)}>
      <div className={dashboardHeroHeaderClass}>
        <div className={dashboardHeroLabelClass}>صندوق ساختمان</div>
      </div>
      <AnimatedMoneyDisplay amount={total} size="hero" tone="hero" />
      {accounts.length ? (
        <p className={dashboardHeroCompareClass}>
          {accounts.map((account, index) => (
            <span key={account.id}>
              {index ? ' · ' : ''}
              {account.title} <MoneyText amount={account.balance} />
            </span>
          ))}
        </p>
      ) : null}
      <p className={dashboardHeroCompareClass}>
        {delta < 0 ? '↓' : '↑'} <MoneyText amount={Math.abs(delta)} /> در {monthName} · وصول منهای
        هزینه
      </p>
    </Card>
  )
}
