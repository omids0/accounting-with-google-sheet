import { logRecordActivity } from '../../services/activityLog'
import { onSharedCopyChanged } from '../../services/sharedCopyChanged'
import { appendRecord, deleteRecord, updateRecord } from '../../services/sheets'
import type { CustomForm } from '../../types'
import type { StoredRecord } from '../records/recordsUtils'

/**
 * The sheet writes of the shared account's pages, through the app's own record writers and the
 * activity log. A shared record moves no wallet money: nothing here touches a wallet account.
 * Callers check `can()` right before calling, so a stale screen cannot bypass a permission.
 */

/** A new shared record (add sheet or settlement); returns its id. */
export async function appendSharedRecord(
  spreadsheetId: string,
  form: CustomForm,
  values: Record<string, string | number>
): Promise<string> {
  const recordId = crypto.randomUUID()

  await appendRecord(spreadsheetId, form, recordId, new Date().toLocaleString('fa-IR'), values)
  logRecordActivity(spreadsheetId, 'create', recordId, values)

  return recordId
}

/** «ذخیرهٔ مبلغ»: the row keeps every other cell (payer, split, creator, reference). */
export async function saveSharedAmount(
  spreadsheetId: string,
  form: CustomForm,
  record: StoredRecord,
  amount: number
): Promise<void> {
  const values = { ...record.values, amount: String(amount) }

  await updateRecord(
    spreadsheetId,
    form,
    record.rowNumber,
    record.id,
    record.createdAt,
    values,
    record.sheetName
  )
  logRecordActivity(spreadsheetId, 'update', record.id, values)
  onSharedCopyChanged({
    kind: 'edit',
    recordId: record.id,
    values: record.values,
    field: 'amount',
    next: amount
  })
}

/** The delete behind the undo toast; `record` carries its current row and tab. */
export async function deleteSharedRecord(
  spreadsheetId: string,
  form: CustomForm,
  record: StoredRecord
): Promise<void> {
  await deleteRecord(spreadsheetId, form, record.rowNumber, record.sheetName)
  logRecordActivity(spreadsheetId, 'delete', record.id, record.values)
  onSharedCopyChanged({ kind: 'delete', recordId: record.id, values: record.values })
}
