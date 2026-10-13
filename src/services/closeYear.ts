import { yearReviewWindowYear } from './yearReviewGate'
import { isoToJalali, jalaliToIso, toIsoDate } from '../utils/jalaliDate'

/** One wallet account as the reconcile step sees it. */
export interface CloseYearAccount {
  id: string
  title: string
  cash: boolean
  /** Bank SMS exist for it (on Android), or it was reconciled with one before. */
  smsBacked: boolean
  /** ISO time of the last successful SMS reconciliation (`accounting_reconcile_v1`). */
  reconciledAt?: string
}

/** Everything the four step marks are derived from; null fields are still loading. */
export interface CloseYearInput {
  year: number
  accounts: CloseYearAccount[] | null
  /** «نقدی را خودت تأیید کن» for this spreadsheet and year. */
  cashConfirmed: boolean
  /** Months present in «موجودی ماهانه» (`YYYY-MM`). */
  openingMonthKeys: string[] | null
  /** Month the automatic opening chain starts from. */
  anchorMonthKey?: string
  /** Rows of `year` still in the form tabs. */
  pendingArchiveRows: number | null
  /** When the wizard's «آرشیو کن» last finished for this year. */
  archivedAt?: number
  /** `accounting_backup_v1` → `lastBackupAt`. */
  lastBackupAt?: number
}

export interface CloseYearReconcileAccount extends CloseYearAccount {
  reconciled: boolean
}

export interface CloseYearStatus {
  reconcile: {
    done: boolean
    smsAccounts: CloseYearReconcileAccount[]
    cashAccounts: CloseYearAccount[]
  }
  opening: { done: boolean; monthKey: string }
  archive: { done: boolean }
  backup: { done: boolean; after: number }
}

/** The wizard's year when opened without one: the ending year from 25 Esfand, else the last one. */
export function closeYearDefaultYear(todayIso: string): number {
  return yearReviewWindowYear(todayIso) ?? isoToJalali(todayIso).year - 1
}

/** A year the wizard accepts: a finished Jalali year, or the ending one from 25 Esfand. */
export function isClosableYear(year: number, todayIso: string): boolean {
  return Number.isInteger(year) && year >= 1300 && year <= closeYearDefaultYear(todayIso)
}

/** 1 Esfand of `year` (ISO): reconciliation from then on counts for the year's close. */
export function esfandStartIso(year: number): string {
  return jalaliToIso(year, 12, 1)
}

/** Local midnight of 1 Esfand, in ms. */
export function esfandStartMs(year: number): number {
  return new Date(`${esfandStartIso(year)}T00:00:00`).getTime()
}

/** `YYYY-01` of the year after `year`: the month step 2 writes. */
export function nextYearOpeningMonth(year: number): string {
  return `${year + 1}-01`
}

function reconciledSince(at: string | undefined, fromIso: string): boolean {
  if (!at) return false

  const date = new Date(at)

  return !Number.isNaN(date.getTime()) && toIsoDate(date) >= fromIso
}

function deriveReconcile(input: CloseYearInput): CloseYearStatus['reconcile'] {
  const fromIso = esfandStartIso(input.year)
  const accounts = input.accounts ?? []
  const smsAccounts = accounts
    .filter(account => !account.cash && account.smsBacked)
    .map(account => ({ ...account, reconciled: reconciledSince(account.reconciledAt, fromIso) }))
  const cashAccounts = accounts.filter(account => account.cash)

  // Without any SMS-backed account (web, or SMS capture off) only the user can confirm.
  const done =
    input.accounts !== null &&
    (smsAccounts.length
      ? smsAccounts.every(account => account.reconciled)
      : !cashAccounts.length || input.cashConfirmed)

  return { done, smsAccounts, cashAccounts }
}

/**
 * The four marks of «بستن سال»: reconcile (every SMS-backed account reconciled after
 * 1 Esfand), opening balances (فروردین of the next year in «موجودی ماهانه», or the
 * chain starts later), archive (no row of the year left in the form tabs), backup
 * (one taken after the archive, and after 1 Esfand).
 */
export function deriveCloseYearSteps(input: CloseYearInput): CloseYearStatus {
  const monthKey = nextYearOpeningMonth(input.year)
  const openingDone =
    input.openingMonthKeys !== null &&
    (input.openingMonthKeys.includes(monthKey) ||
      (!!input.anchorMonthKey && input.anchorMonthKey > monthKey))
  const after = Math.max(input.archivedAt ?? 0, esfandStartMs(input.year))

  return {
    reconcile: deriveReconcile(input),
    opening: { done: openingDone, monthKey },
    archive: { done: input.pendingArchiveRows === 0 },
    backup: { done: input.lastBackupAt !== undefined && input.lastBackupAt > after, after }
  }
}
