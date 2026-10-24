import { CHECKS_HEADERS } from './sheetHeaders'
import type { Check, CheckDirection } from '../types'

/** Header of the checks column that says whether a check is given or received. */
export const CHECK_DIRECTION_HEADER = 'نوع چک'

/** Fixed index of the column; rows from before it existed simply have no cell there. */
export const CHECK_DIRECTION_COLUMN = CHECKS_HEADERS.indexOf(CHECK_DIRECTION_HEADER)

export const CHECK_DIRECTION_LABELS: Record<CheckDirection, string> = {
  paid: 'پرداختی',
  received: 'دریافتی'
}

type WithDirection = Pick<Check, 'direction'>

/** A missing or unknown cell is a payable: that is what every check was before the column. */
export function parseCheckDirection(cell: unknown): CheckDirection {
  return String(cell ?? '').trim() === CHECK_DIRECTION_LABELS.received ? 'received' : 'paid'
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
