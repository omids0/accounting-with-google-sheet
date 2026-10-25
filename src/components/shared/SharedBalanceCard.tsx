import { toPersianDigits } from '../../utils/normalizeDigits'
import AnimatedMoneyDisplay from '../AnimatedMoneyDisplay'
import Button from '../ui/Button'
import Card from '../ui/Card'
import {
  dashboardHeroCardAnimatedClass,
  dashboardHeroCardClass,
  dashboardHeroHeaderClass,
  dashboardHeroLabelClass
} from '../ui/chartStyles'
import { dashboardHeroCompareClass } from '../ui/dashboardCalmStyles'
import { sharedHeadlineClass, sharedHeroButtonClass } from '../ui/sharedStyles'

interface SharedBalanceCardProps {
  /** «شما به مینا بدهکارید» / «مینا به شما بدهکار است» / «حساب شما صاف است». */
  headline: string
  /** What is owed (0 when settled): the amount above the sentence. */
  amount: number
  /** Rows the balance left out (a payer outside the two, say). */
  skipped?: number
  /** «ثبت تسویه», shown while something is owed; null without the `settle` right. */
  onSettle?: (() => void) | null
}

/** The shared home's hero: the balance to date, who owes whom, and «ثبت تسویه». */
export default function SharedBalanceCard({
  headline,
  amount,
  skipped = 0,
  onSettle
}: SharedBalanceCardProps) {
  return (
    <Card className={`${dashboardHeroCardClass} ${dashboardHeroCardAnimatedClass}`}>
      <div className={dashboardHeroHeaderClass}>
        <div className={dashboardHeroLabelClass}>تراز تا امروز</div>
      </div>
      {amount > 0 ? <AnimatedMoneyDisplay amount={amount} size="hero" tone="hero" /> : null}
      <p className={sharedHeadlineClass}>{headline}</p>
      {skipped > 0 ? (
        <p className={dashboardHeroCompareClass}>
          {`${toPersianDigits(String(skipped))} ثبت نامعتبر نادیده گرفته شد`}
        </p>
      ) : null}
      {amount > 0 && onSettle ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className={sharedHeroButtonClass}
          onClick={onSettle}
        >
          ثبت تسویه
        </Button>
      ) : null}
    </Card>
  )
}
