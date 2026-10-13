import { correctionRecord, type AccountReconcile } from './bankSmsReconcile'
import { saveReconcileSuccess } from './bankSmsReconcileStore'
import { createLinkedExpenseRecord, createLinkedIncomeRecord } from './paymentTransactions'
import { applyWalletChanges, recordLedgerContext } from './recordWallet'

/**
 * «تنظیم دستی موجودی»: an income/expense record of category «تطبیق» on the account, which
 * moves its balance through the normal record path (never a direct balance edit). The
 * account then agrees with the SMS, so the reconciliation is stored.
 */
export async function createReconcileCorrection(
  spreadsheetId: string,
  accountId: string,
  result: Pick<AccountReconcile, 'difference' | 'smsAt' | 'smsBalance'>
): Promise<void> {
  if (!result.difference) return

  const { type, ...record } = correctionRecord(result.difference, result.smsAt)
  const params = { ...record, walletAccount: accountId }
  const recordId =
    type === 'expense'
      ? await createLinkedExpenseRecord(spreadsheetId, params)
      : await createLinkedIncomeRecord(spreadsheetId, params)

  await applyWalletChanges(
    spreadsheetId,
    null,
    { accountId, delta: type === 'expense' ? -record.amount : record.amount },
    recordLedgerContext(params, 'اصلاح دستی', recordId)
  )
  saveReconcileSuccess(spreadsheetId, accountId, {
    balance: result.smsBalance,
    smsAt: result.smsAt
  })
}
