import { useMemo, useState } from 'react'

import LoanInputsCard from './loanCalculator/LoanInputsCard'
import LoanResultCards from './loanCalculator/LoanResultCards'
import LoanScheduleTable from './loanCalculator/LoanScheduleTable'
import { loanCalculatorEmptyCardClass, loanCalculatorPageClass } from './ui/calculatorStyles'
import Card from './ui/Card'
import { emptyTextClass } from './ui/displayStyles'
import {
  buildLoanSchedule,
  calculateLoan,
  type LoanMethod,
  validateLoanInput
} from '../utils/loanCalculator'
import { parseNumeric } from '../utils/parseNumeric'

export default function LoanRequestCalculatorPage() {
  const [method, setMethod] = useState<LoanMethod>('annuity')

  const [principal, setPrincipal] = useState<number | ''>('')

  const [annualRate, setAnnualRate] = useState('')

  const [months, setMonths] = useState('')

  const isPristine = principal === '' && annualRate === '' && months === ''

  const errors = useMemo(
    () => (isPristine ? {} : validateLoanInput({ principal, annualRate, months })),
    [isPristine, principal, annualRate, months]
  )

  const input = useMemo(
    () => ({
      principal: principal === '' ? 0 : principal,
      annualRatePercent: parseNumeric(annualRate),
      months: parseNumeric(months)
    }),
    [principal, annualRate, months]
  )

  const isValid = !isPristine && Object.keys(errors).length === 0

  const result = useMemo(
    () => (isValid ? calculateLoan(method, input) : null),
    [isValid, method, input]
  )

  const schedule = useMemo(
    () => (isValid ? buildLoanSchedule(method, input) : []),
    [isValid, method, input]
  )

  return (
    <div className={loanCalculatorPageClass}>
      <LoanInputsCard
        method={method}
        onMethodChange={setMethod}
        principal={principal}
        onPrincipalChange={setPrincipal}
        annualRate={annualRate}
        onAnnualRateChange={setAnnualRate}
        months={months}
        onMonthsChange={setMonths}
        errors={errors}
      />

      {result ? (
        <>
          <LoanResultCards method={method} principal={input.principal} result={result} />
          <LoanScheduleTable rows={schedule} />
        </>
      ) : (
        <Card className={loanCalculatorEmptyCardClass}>
          <p className={emptyTextClass}>
            {isPristine
              ? 'پس از وارد کردن مبلغ، نرخ سود و تعداد ماه، نتیجه محاسبه اینجا نمایش داده می‌شود.'
              : 'برای دیدن نتیجه، خطاهای مشخص‌شده در فرم را برطرف کنید.'}
          </p>
        </Card>
      )}
    </div>
  )
}
