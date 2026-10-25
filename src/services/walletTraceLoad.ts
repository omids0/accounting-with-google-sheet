import { fetchOpeningBalance } from './monthlyBalance'
import { ANCHOR_NOTE, firstDayOfJalaliMonth } from './openingBalanceService'
import { parseCreatedAtMs } from './recordDuplicates'
import { loadRecordLedger } from './recordLedger'
import { fetchWalletAccounts, loadWalletPeriodFlow } from './wallet'
import { fetchAllLedger } from './walletLedger'
import { traceDiscrepancy } from './walletTrace'
import type { TraceReport } from './walletTraceTypes'
import { computeReconciliation } from '../components/wallet/utils'
import type { AppSettings } from '../types'
import { getTodayIso } from '../utils/jalaliDate'
import { roundMoney } from '../utils/roundMoney'

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
  const anchor = await fetchOpeningBalance(spreadsheetId, periodFlow.anchorMonthKey)
  const walletTotal = roundMoney(accounts.reduce((sum, account) => sum + account.balance, 0))
  const { periodBalance, reconciliationDiff } = computeReconciliation(walletTotal, periodFlow)

  return {
    report: traceDiscrepancy({
      difference: reconciliationDiff,
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
