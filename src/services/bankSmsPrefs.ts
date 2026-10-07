import type { LearnedSmsRefs } from './bankSmsMatch'
import type { AccountBalanceState } from './bankSmsQueue'
import { getItem, setItem } from './storage'

/**
 * Device-level state for bank SMS capture. SMS only reach this phone, so none
 * of it belongs in the shared spreadsheet.
 */
export interface BankSmsPrefs {
  enabled: boolean
  /** Inbox catch-up resumes from here (epoch ms). */
  lastScanAt: number
  /** Per account: which SMS the balance already includes (see `nextAccountBalance`). */
  balanceStates: Record<string, AccountBalanceState>
  /** Card/account digits seen in SMS → the account the user tied them to. */
  refAccounts: LearnedSmsRefs
  /** Per template: the category last chosen for it, offered as the next default. */
  lastCategory: Record<string, { category: string; subCategory: string }>
}

export const BANK_SMS_PREFS_KEY = 'accounting_bank_sms'

const DEFAULT_PREFS: BankSmsPrefs = {
  enabled: false,
  lastScanAt: 0,
  balanceStates: {},
  refAccounts: {},
  lastCategory: {}
}

export function getBankSmsPrefs(): BankSmsPrefs {
  return { ...DEFAULT_PREFS, ...getItem<Partial<BankSmsPrefs>>(BANK_SMS_PREFS_KEY) }
}

export function updateBankSmsPrefs(patch: Partial<BankSmsPrefs>): BankSmsPrefs {
  const next = { ...getBankSmsPrefs(), ...patch }

  setItem(BANK_SMS_PREFS_KEY, next)

  return next
}

/** Remember that SMS showing `ref` belong to `accountId`. */
export function learnSmsRef(ref: string | undefined, accountId: string): void {
  if (!ref || !accountId) return

  const prefs = getBankSmsPrefs()

  if (prefs.refAccounts[ref] === accountId) return

  updateBankSmsPrefs({ refAccounts: { ...prefs.refAccounts, [ref]: accountId } })
}
