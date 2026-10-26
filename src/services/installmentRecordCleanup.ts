import { deleteLinkedExpenseRecord } from './paymentTransactions'
import { isLinkedForeignRecord } from './settleRecords'

/**
 * The records of instalments an edited plan made unpaid again. The ones the app created (title
 * «قسط: …») are deleted with their balance effect; a record the user linked (a bank SMS, the entry
 * form) is theirs and stays as an ordinary expense. Resolves with how many were kept.
 */
export async function deleteRemovedPaymentRecords(
  spreadsheetId: string,
  recordIds: readonly string[]
): Promise<number> {
  let kept = 0

  for (const recordId of recordIds) {
    if (await isLinkedForeignRecord(spreadsheetId, 'expense', recordId, 'قسط: ')) {
      kept += 1
      continue
    }
    await deleteLinkedExpenseRecord(spreadsheetId, recordId)
  }

  return kept
}
