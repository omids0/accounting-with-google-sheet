import {
  CHECKS_SHEET,
  DANG_SHEET,
  INSTALLMENTS_SHEET,
  RECEIVABLES_SHEET
} from '../services/sheetNames'
import { getSheetRowsView } from '../services/spreadsheetStore'
import type { LinkTargetKindId } from '../utils/linkTargetKinds'

/**
 * Which kinds had nothing open when their list was last read (per workbook). The next card of that
 * kind shows the «nothing open» hint from its first frame, so it does not grow when the read ends.
 */
export const lastEmpty = new Map<string, boolean>()

/** The tab each kind lists from. A tab the local copy holds with no rows at all has nothing open. */
const KIND_TAB: Record<LinkTargetKindId, string> = {
  dang: DANG_SHEET,
  receivable: RECEIVABLES_SHEET,
  checkPaid: CHECKS_SHEET,
  checkReceived: CHECKS_SHEET,
  installment: INSTALLMENTS_SHEET
}

export const mirrorTabIsEmpty = (spreadsheetId: string, kindId: LinkTargetKindId): boolean => {
  const rows = getSheetRowsView(spreadsheetId, KIND_TAB[kindId])

  return rows !== null && rows.length <= 1
}

/**
 * Bumped after any link is written: every picker on the page reads its list again, so a card does
 * not offer the debt (or check, instalment) another card has just completed.
 */
let linksVersion = 0

const linkListeners = new Set<() => void>()

export const subscribeLinks = (listener: () => void) => {
  linkListeners.add(listener)

  return () => void linkListeners.delete(listener)
}

export const getLinksVersion = () => linksVersion

export const bumpLinks = () => {
  linksVersion += 1
  linkListeners.forEach(listener => listener())
}
