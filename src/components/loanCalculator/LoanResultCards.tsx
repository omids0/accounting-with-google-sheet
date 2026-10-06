import { cn } from '../../utils/cn'
import { getCurrencySymbol } from '../../utils/formatMoney'
import type { LoanCalculationResult, LoanMethod } from '../../utils/loanCalculator'
import { numberToPersianWords } from '../../utils/numberToWords'
import MoneyDisplay from '../MoneyDisplay'
import {
  loanCalculatorFormulaHintClass,
  loanCalculatorResultCardClass,
  loanCalculatorSummaryGridClass,
  loanCalculatorSummaryItemClass,
  loanCalculatorSummaryItemTotalClass,
  loanCalculatorSummaryLabelClass,
  loanMethodBadgeClass
} from '../ui/calculatorStyles'
import Card, { CardTitle } from '../ui/Card'
import {
  dashboardHeroCardClass,
  dashboardHeroHintClass,
  dashboardHeroLabelClass
} from '../ui/chartStyles'

const METHOD_BADGE: Record<LoanMethod, string> = {
  annuity: 'روش اقساطی (بانکی)',
  flat: 'روش سود ساده'
}

const METHOD_FORMULA: Record<LoanMethod, string> = {
  annuity:
    'روش اقساطی (فروش اقساطی / مرابحه): قسط = P × r × (1+r)ⁿ ÷ ((1+r)ⁿ − 1)؛ r = نرخ سود سالانه ÷ ۱۲ و n = تعداد ماه. سود هر ماه روی مانده بدهی حساب می‌شود.',
  flat: 'روش سود ساده: سود کل = مبلغ وام × نرخ سود × (تعداد ماه ÷ ۱۲)؛ سود روی کل مبلغ وام و برای تمام مدت حساب می‌شود.'
}

type LoanResultCardsProps = {
  method: LoanMethod
  principal: number
  result: LoanCalculationResult
}

export default function LoanResultCards({ method, principal, result }: LoanResultCardsProps) {
  const currency = getCurrencySymbol()

  const monthly = Math.round(result.monthlyPayment)

  return (
    <>
      <Card className={cn(dashboardHeroCardClass, loanCalculatorResultCardClass)}>
        <span className={loanMethodBadgeClass}>{METHOD_BADGE[method]}</span>
        <div className={dashboardHeroLabelClass}>قسط ماهانه تقریبی</div>
        <MoneyDisplay amount={monthly} size="hero" tone="hero" />
        <p className={dashboardHeroHintClass}>
          {numberToPersianWords(monthly)} {currency} در هر ماه
        </p>
      </Card>

      <Card>
        <CardTitle className="mb-3">خلاصه بازپرداخت</CardTitle>
        <div className={loanCalculatorSummaryGridClass}>
          <div className={loanCalculatorSummaryItemClass}>
            <span className={loanCalculatorSummaryLabelClass}>اصل وام</span>
            <MoneyDisplay amount={principal} size="stat" />
          </div>
          <div className={loanCalculatorSummaryItemClass}>
            <span className={loanCalculatorSummaryLabelClass}>مجموع سود</span>
            <MoneyDisplay amount={Math.round(result.totalInterest)} size="stat" tone="expense" />
          </div>
          <div className={loanCalculatorSummaryItemTotalClass}>
            <span className={loanCalculatorSummaryLabelClass}>کل پرداختی در پایان</span>
            <MoneyDisplay
              amount={Math.round(result.totalPayment)}
              size="stat-wide"
              tone="primary"
            />
          </div>
        </div>
        <p className={loanCalculatorFormulaHintClass}>{METHOD_FORMULA[method]}</p>
      </Card>
    </>
  )
}
