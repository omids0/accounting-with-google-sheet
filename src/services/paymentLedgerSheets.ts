import { DANG_SHEET, RECEIVABLES_SHEET } from './sheetNames'
import { normalizeSheetTitle } from './sheetsMeta'

const LEDGER_SHEETS = new Set([DANG_SHEET, RECEIVABLES_SHEET].map(normalizeSheetTitle))

/** True for the tabs whose rows carry a payments ledger (debts, receivables). */
export function isPaymentLedgerSheet(sheetName: string): boolean {
  return LEDGER_SHEETS.has(normalizeSheetTitle(sheetName))
}
