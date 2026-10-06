import { parseNumericStrict } from './parseNumeric'

/**
 * `annuity` — equal monthly payments on a declining balance (فروش اقساطی / مرابحه), the
 * method Iranian banks quote. `flat` — simple interest on the full principal for the term.
 */
export type LoanMethod = 'annuity' | 'flat'

export interface LoanCalculationInput {
  principal: number
  annualRatePercent: number
  months: number
}

export interface LoanCalculationResult {
  monthlyPayment: number
  totalPayment: number
  totalInterest: number
}

export interface LoanScheduleRow {
  month: number
  payment: number
  interest: number
  principal: number
  remaining: number
}

function isValidInput({ principal, annualRatePercent, months }: LoanCalculationInput): boolean {
  return (
    Number.isFinite(principal) &&
    Number.isFinite(annualRatePercent) &&
    Number.isInteger(months) &&
    principal > 0 &&
    annualRatePercent >= 0 &&
    months > 0
  )
}

export function calculateFlatRateLoan(input: LoanCalculationInput): LoanCalculationResult | null {
  if (!isValidInput(input)) return null

  const { principal, annualRatePercent, months } = input

  const totalInterest = principal * (annualRatePercent / 100) * (months / 12)

  const totalPayment = principal + totalInterest

  return { monthlyPayment: totalPayment / months, totalPayment, totalInterest }
}

/** payment = P·r·(1+r)^n / ((1+r)^n − 1), r = annual rate / 12; rate 0 → P / n. */
export function calculateAnnuityLoan(input: LoanCalculationInput): LoanCalculationResult | null {
  if (!isValidInput(input)) return null

  const { principal, annualRatePercent, months } = input

  const monthlyRate = annualRatePercent / 100 / 12

  const monthlyPayment =
    monthlyRate === 0
      ? principal / months
      : (principal * monthlyRate * (1 + monthlyRate) ** months) / ((1 + monthlyRate) ** months - 1)

  const totalPayment = monthlyPayment * months

  return { monthlyPayment, totalPayment, totalInterest: totalPayment - principal }
}

export function calculateLoan(
  method: LoanMethod,
  input: LoanCalculationInput
): LoanCalculationResult | null {
  return method === 'annuity' ? calculateAnnuityLoan(input) : calculateFlatRateLoan(input)
}

export function buildLoanSchedule(
  method: LoanMethod,
  input: LoanCalculationInput
): LoanScheduleRow[] {
  const result = calculateLoan(method, input)

  if (!result) return []

  const { principal, annualRatePercent, months } = input

  const monthlyRate = annualRatePercent / 100 / 12

  const rows: LoanScheduleRow[] = []

  let remaining = principal

  for (let month = 1; month <= months; month++) {
    const interest = method === 'annuity' ? remaining * monthlyRate : result.totalInterest / months

    const principalPart =
      month === months
        ? remaining
        : method === 'annuity'
        ? result.monthlyPayment - interest
        : principal / months

    remaining = month === months ? 0 : remaining - principalPart

    rows.push({
      month,
      payment: principalPart + interest,
      interest,
      principal: principalPart,
      remaining
    })
  }

  return rows
}

export type LoanInputErrors = Partial<Record<'principal' | 'annualRate' | 'months', string>>

export interface LoanFormValues {
  principal: number | ''
  annualRate: string
  months: string
}

/** Persian inline messages per field; an empty object means the input can be calculated. */
export function validateLoanInput({
  principal,
  annualRate,
  months
}: LoanFormValues): LoanInputErrors {
  const errors: LoanInputErrors = {}

  if (principal === '' || !(principal > 0)) {
    errors.principal = 'مبلغ وام را بیشتر از صفر وارد کنید.'
  }

  const rate = parseNumericStrict(annualRate)

  if (annualRate.trim() === '') {
    errors.annualRate = 'نرخ سود سالانه را وارد کنید (برای وام بدون سود، صفر).'
  } else if (rate === null) {
    errors.annualRate = 'نرخ سود باید یک عدد معتبر باشد.'
  } else if (rate < 0) {
    errors.annualRate = 'نرخ سود نمی‌تواند منفی باشد.'
  }

  const monthCount = parseNumericStrict(months)

  if (months.trim() === '' || monthCount === 0) {
    errors.months = 'تعداد ماه بازپرداخت باید حداقل ۱ باشد.'
  } else if (monthCount === null || monthCount < 0 || !Number.isInteger(monthCount)) {
    errors.months = 'تعداد ماه باید یک عدد صحیح مثبت باشد.'
  }

  return errors
}
