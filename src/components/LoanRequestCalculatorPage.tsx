import { useMemo, useState } from 'react'

import AmountInput from './AmountInput'
import { FormField } from './form'
import MoneyDisplay from './MoneyDisplay'
import {
  loanCalculatorEmptyCardClass,
  loanCalculatorFormulaHintClass,
  loanCalculatorHintClass,
  loanCalculatorPageClass,
  loanCalculatorResultCardClass,
  loanCalculatorSummaryGridClass,
  loanCalculatorSummaryItemClass,
  loanCalculatorSummaryItemTotalClass,
  loanCalculatorSummaryLabelClass,
  loanRateInputWrapClass,
  loanRateSuffixClass
} from './ui/calculatorStyles'
import Card, { CardTitle } from './ui/Card'
import {
  dashboardHeroCardClass,
  dashboardHeroHintClass,
  dashboardHeroLabelClass
} from './ui/chartStyles'
import { emptyTextClass } from './ui/displayStyles'
import { formHintClass } from './ui/formStyles'
import { cn } from '../utils/cn'
import { getCurrencySymbol } from '../utils/formatMoney'
import { calculateFlatRateLoan } from '../utils/loanCalculator'
import { normalizeDigits } from '../utils/normalizeDigits'
import { numberToPersianWords } from '../utils/numberToWords'

function parseDecimalInput(value: string): string {
  return normalizeDigits(value)
    .replace(/[^\d.]/g, '')
    .replace(/(\..*)\./g, '$1')
}

function parseIntegerInput(value: string): string {
  return normalizeDigits(value).replace(/[^\d]/g, '')
}

export default function LoanRequestCalculatorPage() {
  const [principal, setPrincipal] = useState<number | ''>('')

  const [annualRate, setAnnualRate] = useState('')

  const [months, setMonths] = useState('')

  const result = useMemo(() => {
    const principalValue = principal === '' ? 0 : principal

    const rateValue = annualRate === '' ? 0 : Number(annualRate)

    const monthsValue = months === '' ? 0 : Number(months)

    return calculateFlatRateLoan({
      principal: principalValue,
      annualRatePercent: rateValue,
      months: monthsValue
    })
  }, [principal, annualRate, months])

  const currency = getCurrencySymbol()

  const hasValidInput =
    principal !== '' &&
    principal > 0 &&
    annualRate !== '' &&
    Number(annualRate) >= 0 &&
    months !== '' &&
    Number(months) > 0

  return (
    <div className={loanCalculatorPageClass}>
      <Card>
        <CardTitle>شرایط وام</CardTitle>
        <p className={loanCalculatorHintClass}>
          مبلغ وام، نرخ سود سالانه و مدت بازپرداخت را مطابق اعلام بانک یا موسسه وارد کنید.
        </p>

        <FormField label="مبلغ وام" required>
          <AmountInput value={principal} onChange={setPrincipal} />
        </FormField>

        <FormField
          label="نرخ سود سالانه"
          required
          hint={
            annualRate === '' ? (
              <p className={formHintClass}>مثلاً برای ۲۳٪، عدد ۲۳ را وارد کنید.</p>
            ) : undefined
          }
        >
          <div className={loanRateInputWrapClass} dir="ltr">
            <input
              type="text"
              inputMode="decimal"
              value={annualRate}
              onChange={e => setAnnualRate(parseDecimalInput(e.target.value))}
              dir="ltr"
            />
            <span className={loanRateSuffixClass} aria-hidden="true">
              ٪
            </span>
          </div>
        </FormField>

        <FormField
          label="تعداد ماه بازپرداخت"
          required
          hint={
            months === '' ? (
              <p className={formHintClass}>مثلاً برای وام ۱۸ ماهه، عدد ۱۸ را وارد کنید.</p>
            ) : undefined
          }
        >
          <input
            type="text"
            inputMode="numeric"
            value={months}
            onChange={e => setMonths(parseIntegerInput(e.target.value))}
            dir="ltr"
          />
        </FormField>
      </Card>

      {hasValidInput && result ? (
        <>
          <Card className={cn(dashboardHeroCardClass, loanCalculatorResultCardClass)}>
            <div className={dashboardHeroLabelClass}>قسط ماهانه تقریبی</div>
            <MoneyDisplay amount={Math.round(result.monthlyPayment)} size="hero" tone="hero" />
            <p className={dashboardHeroHintClass}>
              {numberToPersianWords(Math.round(result.monthlyPayment))} {currency} در هر ماه
            </p>
          </Card>

          <Card>
            <CardTitle className="mb-3">خلاصه بازپرداخت</CardTitle>
            <div className={loanCalculatorSummaryGridClass}>
              <div className={loanCalculatorSummaryItemClass}>
                <span className={loanCalculatorSummaryLabelClass}>اصل وام</span>
                <MoneyDisplay amount={principal as number} size="stat" />
              </div>
              <div className={loanCalculatorSummaryItemClass}>
                <span className={loanCalculatorSummaryLabelClass}>مجموع سود</span>
                <MoneyDisplay
                  amount={Math.round(result.totalInterest)}
                  size="stat"
                  tone="expense"
                />
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
            <p className={loanCalculatorFormulaHintClass}>
              محاسبه بر اساس نرخ سود سالانه ساده: سود کل = مبلغ وام × نرخ سود × (تعداد ماه ÷ ۱۲)
            </p>
          </Card>
        </>
      ) : (
        <Card className={loanCalculatorEmptyCardClass}>
          <p className={emptyTextClass}>
            پس از وارد کردن مبلغ، نرخ سود و تعداد ماه، نتیجه محاسبه اینجا نمایش داده می‌شود.
          </p>
        </Card>
      )}
    </div>
  )
}
