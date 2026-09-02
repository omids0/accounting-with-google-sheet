import { useMemo, useState } from 'react'

import AmountInput from './AmountInput'
import { FormField } from './form'
import MoneyDisplay from './MoneyDisplay'
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
    <div className="loan-calculator-page">
      <div className="card">
        <h3 className="card-title">شرایط وام</h3>
        <p className="loan-calculator-hint">
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
              <p className="form-hint">مثلاً برای ۲۳٪، عدد ۲۳ را وارد کنید.</p>
            ) : undefined
          }
        >
          <div className="loan-rate-input-wrap" dir="ltr">
            <input
              type="text"
              inputMode="decimal"
              value={annualRate}
              onChange={e => setAnnualRate(parseDecimalInput(e.target.value))}
              dir="ltr"
            />
            <span className="loan-rate-suffix" aria-hidden="true">
              ٪
            </span>
          </div>
        </FormField>

        <FormField
          label="تعداد ماه بازپرداخت"
          required
          hint={
            months === '' ? (
              <p className="form-hint">مثلاً برای وام ۱۸ ماهه، عدد ۱۸ را وارد کنید.</p>
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
      </div>

      {hasValidInput && result ? (
        <>
          <div className="card dashboard-hero-card loan-calculator-result-card">
            <div className="dashboard-hero-label">قسط ماهانه تقریبی</div>
            <MoneyDisplay amount={Math.round(result.monthlyPayment)} size="hero" tone="hero" />
            <p className="dashboard-hero-hint">
              {numberToPersianWords(Math.round(result.monthlyPayment))} {currency} در هر ماه
            </p>
          </div>

          <div className="card loan-calculator-summary-card">
            <h3 className="card-title">خلاصه بازپرداخت</h3>
            <div className="loan-calculator-summary-grid">
              <div className="loan-calculator-summary-item">
                <span className="loan-calculator-summary-label">اصل وام</span>
                <MoneyDisplay amount={principal as number} size="stat" />
              </div>
              <div className="loan-calculator-summary-item">
                <span className="loan-calculator-summary-label">مجموع سود</span>
                <MoneyDisplay
                  amount={Math.round(result.totalInterest)}
                  size="stat"
                  tone="expense"
                />
              </div>
              <div className="loan-calculator-summary-item loan-calculator-summary-item--total">
                <span className="loan-calculator-summary-label">کل پرداختی در پایان</span>
                <MoneyDisplay
                  amount={Math.round(result.totalPayment)}
                  size="stat-wide"
                  tone="primary"
                />
              </div>
            </div>
            <p className="loan-calculator-formula-hint">
              محاسبه بر اساس نرخ سود سالانه ساده: سود کل = مبلغ وام × نرخ سود × (تعداد ماه ÷ ۱۲)
            </p>
          </div>
        </>
      ) : (
        <div className="card loan-calculator-empty-card">
          <p className="empty-text">
            پس از وارد کردن مبلغ، نرخ سود و تعداد ماه، نتیجه محاسبه اینجا نمایش داده می‌شود.
          </p>
        </div>
      )}
    </div>
  )
}
