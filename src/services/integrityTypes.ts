import type { Transfer } from './transfersModel'
import type { LedgerEntry } from './walletLedger'
import type { WalletAccount } from '../types'

/**
 * «بررسی یکپارچگی»: does each account's stored balance equal what its «گردش حساب» adds up to?
 * Pure and read-only; nothing here writes. «ثبت‌شده» is the balance on the account card;
 * «گردش» is the opening balance (the first history row's balance before it) plus every
 * balance change in «گردش حساب» (transfers included: each leg is a history row).
 */

export type IntegrityKind =
  /** Stored balance differs from the opening + the sum of the account's history. */
  | 'balance-mismatch'
  /** The account holds money but has no history at all, so nothing can be compared. */
  | 'no-history'
  /** An income/expense record names an account that does not exist. */
  | 'record-missing-account'
  /** A transfer moved money out of (or into) only one of its two accounts. */
  | 'transfer-one-leg'
  /** A transfer row whose balance moves never happened. */
  | 'transfer-no-leg'
  /** Two rows of the same tab share one id. */
  | 'duplicate-id'
  /** A write waiting too long, parked as failed, or held by a conflict. */
  | 'outbox-stuck'

/** `problem`: money is probably wrong. `note`: worth knowing, nothing is proven wrong. */
export type IntegritySeverity = 'problem' | 'note'

export interface IntegrityFinding {
  /** Stable across reloads. */
  id: string
  kind: IntegrityKind
  severity: IntegritySeverity
  title: string
  detail: string
  accountId?: string
  /** The money involved, when there is one (signed for `balance-mismatch`: stored − derived). */
  amount?: number
  recordId?: string
  recordType?: 'income' | 'expense'
  transferId?: string
}

/** The first history row where the account's running balance stops adding up. */
export interface SuspectEntry {
  entryId: string
  title: string
  /** `YYYY-MM-DD` of the row; '' when unknown. */
  date: string
  /** `balanceAfter − change − previous balance`: how far the row's own balance is off. */
  gap: number
  /** The balance is off after the last row, not between two rows. */
  afterLast: boolean
}

export interface AccountIntegrity {
  accountId: string
  title: string
  /** The balance on the account card. */
  stored: number
  /** Opening + the sum of the account's history; `null` when it has no history. */
  derived: number | null
  /** `stored − derived`; 0 when equal or not computable. */
  difference: number
  entryCount: number
  suspect: SuspectEntry | null
  /**
   * One «اصلاح» row can make the history add up: the balance moved after the last row. A gap
   * between two rows cannot be fixed without rewriting history, so it is only reported.
   */
  fixable: boolean
}

export interface OutboxIssue {
  id: string
  state: 'pending' | 'failed' | 'conflict'
  sheetName: string
  attempts: number
  /** Epoch ms the write was queued. */
  createdAt: number
  lastError?: string
}

export interface RecordRef {
  id?: string
  accountId: string
  title?: string
  category?: string
  type: 'income' | 'expense'
  amount: number
}

export interface IntegrityInput {
  accounts: WalletAccount[]
  ledger: LedgerEntry[]
  transfers: Transfer[]
  records: RecordRef[]
  outbox: OutboxIssue[]
  /** Epoch ms; decides how long a pending write may wait. */
  now: number
}

export interface IntegrityReport {
  accounts: AccountIntegrity[]
  findings: IntegrityFinding[]
  /** Accounts whose stored balance and history disagree. */
  mismatched: number
  /** Nothing to report at all. */
  clean: boolean
}

/** A write queued longer than this, or retried this often, counts as stuck. */
export const OUTBOX_STUCK_AFTER_MS = 10 * 60 * 1000
export const OUTBOX_STUCK_ATTEMPTS = 3
