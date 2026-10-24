import { describe, expect, it } from 'vitest'

import { computeReconciliation, walletDeleteMessage } from './utils'
import type { WalletPeriodFlow } from '../../services/wallet'

const flow = (opening: number, income: number, expense: number): WalletPeriodFlow => ({
  openingBalance: opening,
  totalIncome: income,
  totalExpense: expense,
  monthKey: '1405-07',
  monthLabel: 'مهر ۱۴۰۵',
  anchorMonthKey: '1405-07'
})

describe('wallet reconciliation', () => {
  it('shows no gap for a difference that is only floating-point noise', () => {
    const result = computeReconciliation(0.3, flow(0.1, 0.2, 0))

    expect(result.reconciliationDiff).toBe(0)
    expect(result.hasReconciliationGap).toBe(false)
  })

  it('keeps a real gap, rounded to two decimals', () => {
    const result = computeReconciliation(10931882.3, flow(0, 0, 0))

    expect(result.reconciliationDiff).toBe(10931882.3)
    expect(result.hasReconciliationGap).toBe(true)
  })
})

describe('wallet delete confirmation', () => {
  it('names the account and says what stays', () => {
    const message = walletDeleteMessage('بانک ملی')

    expect(message).toContain('«بانک ملی»')
    expect(message).toContain('رکوردهای مالی آن می‌مانند')
  })

  it('still reads well without a title', () => {
    expect(walletDeleteMessage(undefined).startsWith('حذف حساب؟')).toBe(true)
  })
})
