import { fetchReceivables } from './receivablesCrud'
import {
  RECEIVABLES_SHEET,
  getReceivableDisplayTitle,
  receivableToRow,
  rowToReceivable
} from './receivablesRow'
import { createRecordLinkAdapter } from './recordLinkAdapter'
import type { Receivable } from '../types'

/** Personal receivables: the income records their payments point at (same rules as debts). */
export const receivableRecordLink = createRecordLinkAdapter<Receivable>({
  kind: 'receivables',
  noun: 'طلب',
  recordType: 'income',
  sheetName: RECEIVABLES_SHEET,
  rowToItem: rowToReceivable,
  fetchItems: fetchReceivables,
  withState: receivable => receivable,
  toRow: receivableToRow,
  titleOf: getReceivableDisplayTitle
})
