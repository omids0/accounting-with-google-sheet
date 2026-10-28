import type { MatchedSms } from './bankSmsQueue'
import { formatSignedMoney } from '../utils/formatMoney'
import { roundMoney } from '../utils/roundMoney'

/** Per account: what the SMS confirmed so far already account for. */
export interface AccountBalanceState {
  /** `receivedAt` of the SMS whose «مانده» last set the balance. */
  anchor?: number
  /** Newest `receivedAt` applied in any way. */
  lastAppliedAt?: number
}

/** The state after an SMS was applied in any way: the anchor stays, the newest applied time moves on. */
export function appliedState(state: AccountBalanceState, receivedAt: number): AccountBalanceState {
  return { anchor: state.anchor, lastAppliedAt: Math.max(state.lastAppliedAt ?? 0, receivedAt) }
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

  return { balance: current + delta, state: appliedState(state, change.receivedAt) }
}

/**
 * The notice for a balance that did not move by the SMS amount (it was set to the SMS «مانده»),
 * or `null` when it moved by exactly that amount or did not change. `old` must be the balance the
 * sheet holds now, so the figures in the text are the real change.
 */
export function balanceAdjustNotice(
  old: number,
  next: number,
  smsAmount: number,
  direction: MatchedSms['direction'],
  title: string
): string | null {
  const moved = roundMoney(old + (direction === 'debit' ? -smsAmount : smsAmount))

  if (roundMoney(next) === roundMoney(old) || roundMoney(next) === moved) return null

  return `موجودی «${title}» از ${formatSignedMoney(old)} به ${formatSignedMoney(
    next
  )} تنظیم شد (مانده پیامک)`
}

/**
 * The notice for an own-account transfer confirmed from SMS: the balances moved by the amount (never
 * set to the SMS «مانده»), and this account's new balance differs from the «مانده» the SMS shows. `null`
 * when the SMS has no «مانده» or the figures agree.
 */
export function transferBalanceNotice(
  title: string,
  balance: number,
  smsBalance: number | null
): string | null {
  if (smsBalance === null || roundMoney(balance) === roundMoney(smsBalance)) return null

  return `موجودی «${title}» بعد از انتقال ${formatSignedMoney(
    balance
  )} شد، ولی «مانده» پیامک ${formatSignedMoney(smsBalance)} است؛ تفاوت را در «گردش حساب» بررسی کن`
}
