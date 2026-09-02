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

export function calculateFlatRateLoan({
  principal,
  annualRatePercent,
  months
}: LoanCalculationInput): LoanCalculationResult | null {
  if (principal <= 0 || annualRatePercent < 0 || months <= 0) {
    return null
  }

  const totalInterest = principal * (annualRatePercent / 100) * (months / 12)

  const totalPayment = principal + totalInterest

  const monthlyPayment = totalPayment / months

  return {
    monthlyPayment,
    totalPayment,
    totalInterest
  }
}
