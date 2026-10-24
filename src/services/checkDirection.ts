import { CHECKS_HEADERS } from './sheetHeaders'
import type { Check, CheckDirection } from '../types'
import { toPersianDigits } from '../utils/normalizeDigits'

/** Header of the checks column that says whether a check is given or received. */
export const CHECK_DIRECTION_HEADER = 'نوع چک'

/**
 * Where the column goes when it is free. The tab is read by the header LABEL (the app's own
 * columns, up to «ثبت‌کننده», stay positional), so a spreadsheet whose column here is taken has
 * the type further right.
 */
export const CHECK_DIRECTION_COLUMN = CHECKS_HEADERS.indexOf(CHECK_DIRECTION_HEADER)

export const CHECK_DIRECTION_LABELS: Record<CheckDirection, string> = {
  paid: 'پرداختی',
  received: 'دریافتی'
}

type WithDirection = Pick<Check, 'direction'>

/** Arabic ye/kaf, ZWNJ/ZWJ, spaces and case folded away: «دریافتـی» and « Received » read alike. */
function normalizeCell(cell: unknown): string {
  return String(cell ?? '')
    .normalize('NFC')
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\u200c\u200d\u0640\s]/g, '')
    .toLowerCase()
}

const RECEIVED_CELLS = new Set(['دریافتی', 'دریافت', 'received', 'receive'])
const PAID_CELLS = new Set(['پرداختی', 'پرداخت', 'paid', 'pay'])

/** A missing or unknown cell is a payable: that is what every check was before the column. */
export function parseCheckDirection(cell: unknown): CheckDirection {
  return RECEIVED_CELLS.has(normalizeCell(cell)) ? 'received' : 'paid'
}

/** The raw cell when it says neither type (someone typed there); '' otherwise. */
export function unknownDirectionCell(cell: unknown): string {
  const key = normalizeCell(cell)

  return key && !RECEIVED_CELLS.has(key) && !PAID_CELLS.has(key) ? String(cell).trim() : ''
}

/** Where a header row keeps «نوع چک»; -1 while the tab has no such label. */
export function headerDirectionColumn(header: readonly unknown[] | null | undefined): number {
  return header
    ? header.findIndex(cell => normalizeCell(cell) === normalizeCell(CHECK_DIRECTION_HEADER))
    : -1
}

export function isReceivedCheck(check: WithDirection): boolean {
  return check.direction === 'received'
}

export function checksOfDirection<T extends WithDirection>(
  checks: readonly T[],
  direction: CheckDirection
): T[] {
  return checks.filter(check => check.direction === direction)
}

/** Passing a payable is an expense (money leaves the account); a received check is income. */
export function checkRecordType(check: WithDirection): 'expense' | 'income' {
  return isReceivedCheck(check) ? 'income' : 'expense'
}

/** «چک پرداختی» / «چک دریافتی». */
export function checkTypeLabel(check: WithDirection): string {
  return `چک ${CHECK_DIRECTION_LABELS[check.direction]}`
}

/** «چک دریافتی ۱۲۳»: the type and the number in Persian digits (search results). */
export function checkListTitle(check: WithDirection & Pick<Check, 'checkNumber'>): string {
  return `${checkTypeLabel(check)} ${toPersianDigits(check.checkNumber)}`.trim()
}
