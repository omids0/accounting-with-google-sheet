import type { WalletAccountWithRow } from './types'
import type { WalletPeriodFlow } from '../../services/wallet'

export function computeTotalBalance(
  items: WalletAccountWithRow[],
  balances: Record<string, number | ''>
): number {
  return items.reduce((sum, item) => {
    const value = balances[item.id]

    return sum + (value === '' ? item.balance : Number(value))
  }, 0)
}

export function computePeriodBalance(periodFlow: WalletPeriodFlow | null): number {
  if (periodFlow == null) return 0

  return periodFlow.openingBalance + periodFlow.totalIncome - periodFlow.totalExpense
}

export function computeReconciliation(totalBalance: number, periodFlow: WalletPeriodFlow | null) {
  const periodBalance = computePeriodBalance(periodFlow)
  const reconciliationDiff = totalBalance - periodBalance
  const hasReconciliationGap = periodFlow != null && Math.abs(reconciliationDiff) > 0

  return { periodBalance, reconciliationDiff, hasReconciliationGap }
}
