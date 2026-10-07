import { getItem, setItem } from './storage'

/**
 * Device-level state for bank SMS capture. SMS only reach this phone, so none
 * of it belongs in the shared spreadsheet.
 */
export interface BankSmsPrefs {
  enabled: boolean
  /** Inbox catch-up resumes from here (epoch ms). */
  lastScanAt: number
  /**
   * Per account: `receivedAt` of the newest SMS whose «مانده» set the balance.
   * Older SMS never move the balance past it.
   */
  balanceAnchors: Record<string, number>
  /** Per template: the category last chosen for it, offered as the next default. */
  lastCategory: Record<string, { category: string; subCategory: string }>
}

export const BANK_SMS_PREFS_KEY = 'accounting_bank_sms'

const DEFAULT_PREFS: BankSmsPrefs = {
  enabled: false,
  lastScanAt: 0,
  balanceAnchors: {},
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
