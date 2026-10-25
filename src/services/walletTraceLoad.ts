import { fetchActivityLog } from './activityLog'
import { fetchOpeningBalance, fetchOpeningBalanceRows } from './monthlyBalance'
import { ANCHOR_NOTE, firstDayOfJalaliMonth } from './openingBalanceService'
import { parseCreatedAtMs } from './recordDuplicates'
import { loadRecordLedger } from './recordLedger'
import { fetchWalletAccounts, loadWalletPeriodFlow } from './wallet'
import { readDifferenceHistory, recordDifference, snapshotOf } from './walletDifferenceHistory'
import { fetchAllLedger } from './walletLedger'
import { traceDiscrepancy } from './walletTrace'
import { openingShiftsFrom } from './walletTraceStory'
import type { TraceEvent, TraceReport } from './walletTraceTypes'
import { computeReconciliation } from '../components/wallet/utils'
import type { AppSettings } from '../types'
import { getTodayIso } from '../utils/jalaliDate'
import { roundMoney } from '../utils/roundMoney'

/** Modules whose changes can move the calculated balance without touching an account. */
const BALANCE_MODULES = new Set([
  'records',
  'recurring',
  'receivables',
  'installments',
  'dang',
  'checks',
  'goals',
  'wallet'
])

/** The activity tab keeps at most this many rows (older ones move to yearly archives). */
const ACTIVITY_READ = 2000

async function loadEvents(
  spreadsheetId: string
): Promise<{ events: TraceEvent[]; oldestAt: number | null }> {
  const entries = await fetchActivityLog(spreadsheetId, ACTIVITY_READ, 0).catch(() => [])
  const times = entries.map(entry => Date.parse(entry.at)).filter(Number.isFinite)
  const events = entries
    .filter(entry => BALANCE_MODULES.has(entry.module))
    .map(entry => ({
      at: Date.parse(entry.at),
      action: entry.action,
      module: entry.module,
      summary: entry.summary
    }))
    .filter(event => Number.isFinite(event.at))

  // A full read may have been cut short at the old end; a short one is the whole log.
  return { events, oldestAt: entries.length >= ACTIVITY_READ ? Math.min(...times) : null }
}

export interface WalletTraceResult {
  report: TraceReport
  /** «تیر ۱۴۰۵»: the month the wallet page is looking at. */
  monthLabel: string
  walletTotal: number
  periodBalance: number
  /** The account history could not be read, so the causes below may be incomplete. */
  ledgerFailed: boolean
}

/**
 * Reads everything the wallet page's difference is made of (accounts, their history, every
 * record, the opening of the first month) and traces it. Reads only; nothing is written
 * except what the wallet page itself already writes when it opens.
 */
export async function loadWalletTrace(settings: AppSettings): Promise<WalletTraceResult> {
  const { spreadsheetId } = settings
  let ledgerFailed = false
  const [accounts, ledger, records, periodFlow] = await Promise.all([
    fetchWalletAccounts(spreadsheetId),
    fetchAllLedger(spreadsheetId).catch(() => {
      ledgerFailed = true

      return []
    }),
    loadRecordLedger(settings),
    loadWalletPeriodFlow(settings)
  ])
  const [anchor, openingRows, activity] = await Promise.all([
    fetchOpeningBalance(spreadsheetId, periodFlow.anchorMonthKey),
    fetchOpeningBalanceRows(spreadsheetId),
    loadEvents(spreadsheetId)
  ])
  const walletTotal = roundMoney(accounts.reduce((sum, account) => sum + account.balance, 0))
  const { periodBalance, reconciliationDiff } = computeReconciliation(walletTotal, periodFlow)

  if (accounts.length) recordDifference(spreadsheetId, snapshotOf(accounts, periodFlow))

  return {
    report: traceDiscrepancy({
      difference: reconciliationDiff,
      openingShifts: openingShiftsFrom(openingRows),
      history: readDifferenceHistory(spreadsheetId),
      events: activity.events,
      eventsOldestAt: activity.oldestAt,
      accounts,
      ledger,
      records,
      anchorMonthKey: periodFlow.anchorMonthKey,
      anchorAmount: anchor.amount,
      anchorStart: firstDayOfJalaliMonth(periodFlow.anchorMonthKey),
      anchorWrittenAtMs: parseCreatedAtMs(anchor.updatedAt),
      anchorIsSnapshot: anchor.note === ANCHOR_NOTE,
      currentMonthKey: periodFlow.monthKey,
      today: getTodayIso()
    }),
    monthLabel: periodFlow.monthLabel,
    walletTotal,
    periodBalance,
    ledgerFailed
  }
}
