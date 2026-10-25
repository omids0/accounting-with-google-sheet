import type { LedgerEntry as RecordEntry } from './recordDuplicates'
import type { LedgerEntry as WalletLedgerEntry } from './walletLedger'
import type { WalletAccount } from '../types'

/**
 * Why «موجودی کیف پول» and «مانده محاسبه‌شده» disagree. Every finding carries the amount it
 * adds to `wallet − calculated`, so the findings add up to the difference (plus a remainder).
 */
export type TraceKind =
  /** An income/expense record that names no account, so no balance moved. */
  | 'no-account'
  /** The record names an account but «اثر بر موجودی» is off. */
  | 'unapplied'
  /** The record names an account, yet the account history has no row for it. */
  | 'no-ledger'
  /** The amount on the record and the balance change in the history differ (edited later). */
  | 'amount-mismatch'
  /** A record dated after today already moved the balance. */
  | 'future-dated'
  /** A record dated before the first month moved the balance after the opening was set. */
  | 'backdated'
  /** The balance moved before the automatic opening was taken, then the record counted again. */
  | 'in-anchor'
  /** History rows whose record no longer exists. */
  | 'orphan-ledger'
  /** A balance change in the history that no record explains. */
  | 'unlinked-ledger'
  /** The account balance changed without a history row (sheet edit, two devices at once). */
  | 'outside-ledger'
  /** An account deleted with money still in it. */
  | 'deleted-account'
  /** A typed balance edit on an account card. */
  | 'manual-balance'
  /** The starting balance of an account created after the first month. */
  | 'initial-balance'
  /** Money moved into (or out of) a savings goal. */
  | 'goal'
  /** An earlier «اصلاح موجودی» record that closed an older difference. */
  | 'plug'

/** `suspect`: probably a mistake to fix. `known`: a deliberate move the formula cannot see. */
export type TraceGroup = 'suspect' | 'known'

/** `exact`: plain arithmetic on the data. `likely`: a reading of the data that can be wrong. */
export type TraceCertainty = 'exact' | 'likely'

export interface TraceFinding {
  /** Stable across reloads, so «تأیید کردم» can be remembered. */
  id: string
  kind: TraceKind
  group: TraceGroup
  certainty: TraceCertainty
  /** Signed share of `wallet − calculated` (rounded money). */
  effect: number
  title: string
  detail: string
  /** `YYYY-MM-DD`; '' when the change cannot be dated. */
  date: string
  accountId?: string
  accountTitle?: string
  record?: { id: string; type: 'income' | 'expense' }
}

export interface TraceMonth {
  monthKey: string
  /** Sum of the dated findings of this month. */
  effect: number
  /** Running total up to and including this month. */
  cumulative: number
  count: number
}

export interface TraceHint {
  text: string
  record?: { id: string; type: 'income' | 'expense' }
  date?: string
}

export interface TraceReport {
  difference: number
  findings: TraceFinding[]
  /** Sum of every finding's effect. */
  explained: number
  /** `difference − explained`: what no trace in the data accounts for. */
  remainder: number
  timeline: TraceMonth[]
  /** Effect of findings that cannot be dated. */
  undated: number
  /** First month a non-plug finding appears in. */
  originMonthKey: string
  /** The first month's opening balance that would have made the remainder disappear. */
  impliedAnchor: number | null
  hints: TraceHint[]
}

export interface TraceInput {
  /** `wallet − calculated`, exactly the figure the wallet page shows. */
  difference: number
  accounts: WalletAccount[]
  /** Every history row of every account, in the order they were appended. */
  ledger: WalletLedgerEntry[]
  /** Every income/expense record. */
  records: RecordEntry[]
  anchorMonthKey: string
  anchorAmount: number
  /** `YYYY-MM-DD` first day of the first month of the automatic chain. */
  anchorStart: string
  /** When the opening of that first month was written (epoch ms); null when unreadable. */
  anchorWrittenAtMs: number | null
  /** The opening was taken automatically from the wallet total, not typed by the user. */
  anchorIsSnapshot: boolean
  currentMonthKey: string
  /** `YYYY-MM-DD` */
  today: string
}

/** What every detector needs, built once. */
export interface TraceContext {
  input: TraceInput
  accountTitles: Map<string, string>
  ledgerByRecord: Map<string, WalletLedgerEntry[]>
  recordIds: Set<string>
}
