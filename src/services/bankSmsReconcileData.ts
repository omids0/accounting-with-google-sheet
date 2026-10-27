import { smsCoverage, smsCoverageParts } from './bankSmsCoverage'
import { localLinkedRecords } from './bankSmsLinked'
import {
  getPendingBankSms,
  isBankSmsAvailable,
  listBankSmsInbox,
  type BankSmsItem
} from './bankSmsNative'
import { getBankSmsPrefs } from './bankSmsPrefs'
import { reviewSms, type ReviewedSms } from './bankSmsQueue'
import { buildDigestLines, type ReconcileLinks } from './bankSmsReconcile'
import { readReconcileEntries, writeReconcileDigestGate } from './bankSmsReconcileStore'
import { fetchSmsTemplates } from './bankSmsTemplates'
import type { LedgerEntry } from './recordDuplicates'
import { resolveAccountKind } from '../components/wallet/walletCardUtils'
import type { WalletAccount } from '../types'
import { getCurrency } from '../utils/formatMoney'
import { getTodayIso } from '../utils/jalaliDate'

/** Bank-like inbox SMS per read (the native side scans at most 300 inbox rows). */
const INBOX_LIMIT = 200

/** SMS exist only in the Android app, and only once capture is on. */
export function isReconcileAvailable(): boolean {
  return isBankSmsAvailable() && getBankSmsPrefs().enabled
}

type ReconcileAccount = Pick<
  WalletAccount,
  'id' | 'title' | 'balance' | 'accountKind' | 'cardNumber' | 'accountNumber' | 'iban'
>

/** Cash never gets a reconciliation block. */
export function canReconcile(account: Pick<WalletAccount, 'accountKind'>): boolean {
  return resolveAccountKind(account) !== 'cash'
}

/**
 * Recognised bank SMS of the phone: the inbox (also SMS already confirmed or dismissed)
 * plus the native queue (live captures). Empty off Android or with capture off.
 */
export async function loadReconcileSms(
  spreadsheetId: string,
  accounts: ReconcileAccount[]
): Promise<ReviewedSms[]> {
  if (!isReconcileAvailable()) return []

  const [templates, pending, inbox] = await Promise.all([
    fetchSmsTemplates(spreadsheetId),
    getPendingBankSms().catch((): BankSmsItem[] => []),
    // Rejects without the SMS permission; the queue alone still works.
    listBankSmsInbox(INBOX_LIMIT).catch((): BankSmsItem[] => [])
  ])
  const byId = new Map<string, BankSmsItem>()

  for (const sms of [...inbox, ...pending]) byId.set(sms.id, sms)

  return reviewSms(
    [...byId.values()],
    templates,
    accounts.filter(canReconcile),
    getCurrency(),
    getBankSmsPrefs().refAccounts
  )
}

/**
 * What the reconcile needs to match SMS to records like the queue does: the debt/receivable
 * payment records (±3 days), how much of each SMS covered, and the SMS closed as parts of one
 * payment. Local mirror and device prefs only, no network.
 */
export function localReconcileLinks(
  reviewed: ReviewedSms[],
  ledger: LedgerEntry[]
): ReconcileLinks {
  return {
    linked: localLinkedRecords(reviewed, ledger),
    coverage: smsCoverage(),
    parts: smsCoverageParts()
  }
}

/** Rebuilds today's digest lines from fresh data; returns them. */
export function refreshReconcileDigest(
  spreadsheetId: string,
  accounts: ReconcileAccount[],
  reviewed: ReviewedSms[],
  ledger: LedgerEntry[]
): string[] {
  const lines = buildDigestLines(
    accounts.filter(canReconcile),
    reviewed,
    ledger,
    readReconcileEntries(spreadsheetId),
    localReconcileLinks(reviewed, ledger)
  )

  writeReconcileDigestGate(spreadsheetId, { date: getTodayIso(), lines })

  return Object.values(lines)
}
