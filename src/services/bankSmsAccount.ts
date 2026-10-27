import type { ConfirmableSms, ReviewedSms } from './bankSmsQueue'

/** Pin an SMS that fits several accounts to one of them; `null` when it cannot be written. */
export function resolveSmsAccount(entry: ReviewedSms, accountId: string): ConfirmableSms | null {
  const { result, amount } = entry

  if (amount === null) return null
  if (result.kind === 'matched') return { ...entry, result, amount }
  if (result.kind !== 'ambiguous') return null

  const candidate = result.candidates.find(item => item.accountId === accountId)

  if (!candidate) return null

  const { direction, unit, balance, ref } = result

  return {
    ...entry,
    amount,
    result: { kind: 'matched', ...candidate, direction, unit, amount: result.amount, balance, ref }
  }
}

/** The account a card starts with: the matched one, else the first candidate. */
export function initialSmsAccount(entry: ReviewedSms): string {
  const { result } = entry

  if (result.kind === 'matched') return result.accountId

  return result.kind === 'ambiguous' ? result.candidates[0]?.accountId ?? '' : ''
}

/**
 * The account a phone card starts on. An SMS that fits several accounts starts on NONE: saving it
 * would write on, and learn, a guess, so swipe and the main button wait until a chip is tapped.
 */
export function initialCardAccount(entry: ReviewedSms): string {
  const { result } = entry

  return result.kind === 'ambiguous' && result.candidates.length > 1 ? '' : initialSmsAccount(entry)
}

/**
 * Income or expense, from the direction the SMS itself reports. It does not wait for the account:
 * an ambiguous incoming SMS is an income before any chip is tapped.
 */
export function smsEntryType(entry: ReviewedSms): 'income' | 'expense' {
  const { result } = entry

  return (result.kind === 'matched' || result.kind === 'ambiguous') && result.direction === 'credit'
    ? 'income'
    : 'expense'
}
