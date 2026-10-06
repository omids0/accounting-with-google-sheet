import type { LoanInputErrors, LoanMethod } from '../../utils/loanCalculator'
import { normalizeDigits } from '../../utils/normalizeDigits'
import AmountInput from '../AmountInput'
import { FormField } from '../form'
import TransactionTypeSegment from '../TransactionTypeSegment'
import {
  loanCalculatorHintClass,
  loanRateInputWrapClass,
  loanRateSuffixClass
} from '../ui/calculatorStyles'
import Card, { CardTitle } from '../ui/Card'
import { formFieldClass, formHintClass, formLabelClass } from '../ui/formStyles'

export const LOAN_METHOD_OPTIONS: { id: LoanMethod; label: string }[] = [
  { id: 'annuity', label: 'اقساطی (روش بانکی)' },
  { id: 'flat', label: 'سود ساده' }
]

/** Digits, one decimal point (also «٫») and a leading minus so a negative rate can be flagged. */
function sanitizeRateInput(value: string): string {
  const text = normalizeDigits(value).replace(/[٫]/g, '.').replace(/−/g, '-')

  const negative = text.trimStart().startsWith('-')

  const digits = text.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1')

  return negative ? `-${digits}` : digits
}

function sanitizeIntegerInput(value: string): string {
  return normalizeDigits(value).replace(/[^\d]/g, '')
}

type LoanInputsCardProps = {
  method: LoanMethod
  onMethodChange: (method: LoanMethod) => void
  principal: number | ''
  onPrincipalChange: (value: number | '') => void
  annualRate: string
  onAnnualRateChange: (value: string) => void
  months: string
  onMonthsChange: (value: string) => void
  errors: LoanInputErrors
}

export default function LoanInputsCard({
  method,
  onMethodChange,
  principal,
  onPrincipalChange,
  annualRate,
  onAnnualRateChange,
  months,
  onMonthsChange,
  errors
}: LoanInputsCardProps) {
  return (
    <Card>
      <CardTitle>شرایط وام</CardTitle>
      <p className={loanCalculatorHintClass}>
        مبلغ وام، نرخ سود سالانه و مدت بازپرداخت را مطابق اعلام بانک یا موسسه وارد کنید.
      </p>

      <div className={formFieldClass}>
        <span className={formLabelClass}>روش محاسبه</span>
        <TransactionTypeSegment
          options={LOAN_METHOD_OPTIONS}
          value={method}
          onChange={id => onMethodChange(id as LoanMethod)}
          ariaLabel="روش محاسبه سود"
        />
      </div>

      <FormField label="مبلغ وام" required error={errors.principal}>
        <AmountInput
          value={principal}
          onChange={onPrincipalChange}
          invalid={Boolean(errors.principal)}
        />
      </FormField>

      <FormField
        label="نرخ سود سالانه"
        required
        error={errors.annualRate}
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
            onChange={e => onAnnualRateChange(sanitizeRateInput(e.target.value))}
            aria-invalid={Boolean(errors.annualRate)}
            aria-label="نرخ سود سالانه"
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
        error={errors.months}
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
          onChange={e => onMonthsChange(sanitizeIntegerInput(e.target.value))}
          aria-invalid={Boolean(errors.months)}
          aria-label="تعداد ماه بازپرداخت"
          dir="ltr"
        />
      </FormField>
    </Card>
  )
}
