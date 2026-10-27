import type { MatchedSms } from './bankSmsQueue'

/** Per account: what the SMS confirmed so far already account for. */
export interface AccountBalanceState {
  /** `receivedAt` of the SMS whose «مانده» last set the balance. */
  anchor?: number
  /** Newest `receivedAt` applied in any way. */
  lastAppliedAt?: number
}

/**
 * True when this SMS sets the balance to its own «مانده» (an absolute write): it carries one and
 * is the newest applied so far. Every other SMS only moves the balance by its amount, and must
 * be applied as a change on the balance the sheet holds now.
 */
export function setsAbsoluteBalance(
  receivedAt: number,
  smsBalance: number | null,
  state: AccountBalanceState
): boolean {
  return smsBalance !== null && receivedAt >= (state.lastAppliedAt ?? 0)
}

/**
 * New balance after one SMS, or `null` when the balance must not move.
 * - Older than the anchor: that «مانده» already includes it.
 * - Has a «مانده» and is the newest so far: the balance becomes that «مانده».
 * - Otherwise (no «مانده», or confirmed after a newer SMS): add/subtract the amount,
 *   because a «مانده» from the past would undo the newer SMS already applied.
 */
export function nextAccountBalance(
  current: number,
  change: { receivedAt: number; direction: MatchedSms['direction']; amount: number },
  smsBalance: number | null,
  state: AccountBalanceState
): { balance: number; state: AccountBalanceState } | null {
  const { anchor, lastAppliedAt } = state

  if (anchor !== undefined && change.receivedAt < anchor) return null

  const lastApplied = Math.max(lastAppliedAt ?? 0, change.receivedAt)

  if (smsBalance !== null && setsAbsoluteBalance(change.receivedAt, smsBalance, state)) {
    return { balance: smsBalance, state: { anchor: change.receivedAt, lastAppliedAt: lastApplied } }
  }

  const delta = change.direction === 'debit' ? -change.amount : change.amount

  return { balance: current + delta, state: { anchor, lastAppliedAt: lastApplied } }
}
