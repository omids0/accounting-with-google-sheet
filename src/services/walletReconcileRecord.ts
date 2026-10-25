import { createLinkedExpenseRecord, createLinkedIncomeRecord } from './paymentTransactions'
import { RECONCILIATION_CATEGORY } from '../utils/protectedCategories'
import { roundMoney } from '../utils/roundMoney'

/**
 * Closes a wallet/calculated-balance gap with a real income (wallet above) or expense (wallet
 * below) record in «اصلاح موجودی». It names no account, so no balance moves.
 */
export async function postReconciliationRecord(
  spreadsheetId: string,
  difference: number,
  monthLabel: string
): Promise<void> {
  const params = {
    title: RECONCILIATION_CATEGORY,
    amount: roundMoney(Math.abs(difference)),
    category: RECONCILIATION_CATEGORY,
    note: `تطبیق کیف پول با مانده محاسبه‌شده — ${monthLabel}`
  }

  if (difference > 0) {
    await createLinkedIncomeRecord(spreadsheetId, params)
  } else {
    await createLinkedExpenseRecord(spreadsheetId, params)
  }
}
