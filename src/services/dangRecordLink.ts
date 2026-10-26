import { dangToRow, fetchDangs, rowToDang, withDangPaidState } from './dangRow'
import { createRecordLinkAdapter } from './recordLinkAdapter'
import { DANG_SHEET } from './sheetNames'
import type { Dang } from '../types'

/**
 * Personal debts: the expense records their payments point at. A deleted record takes its payments
 * off the debt (`onRecordDeleted` is «detach the payments of a record»); an edited one moves the
 * payment's amount and date with it.
 */
export const dangRecordLink = createRecordLinkAdapter<Dang>({
  kind: 'dang',
  noun: 'بدهی',
  recordType: 'expense',
  sheetName: DANG_SHEET,
  rowToItem: rowToDang,
  fetchItems: fetchDangs,
  withState: withDangPaidState,
  toRow: dangToRow,
  titleOf: dang => dang.title
})
