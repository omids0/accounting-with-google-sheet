import { logItemActivity } from './activityLog'
import { queueGoalCongrats, resetGoalCongrats } from './goalCongrats'
import { exportSheetCsv, importSheetCsv, newImportId, newImportTimestamp } from './importExport'
import {
  GOAL_LEDGER_SOURCE,
  goalBalances,
  goalNetDepositsIn,
  goalToRow,
  nextGoalStatus,
  rowToGoal
} from './savingsGoals'
import { validateSavingsGoalCsvCells } from './savingsGoalsCsvValidate'
import { TREASURY_GOALS_HEADERS } from './sheetHeaders'
import { TREASURY_GOALS_SHEET, WALLET_LEDGER_SHEET } from './sheetNames'
import { appendSheetRow, ensureSheetWithHeaders, fetchSheetRows, updateSheetRow } from './sheets'
import { fetchWalletAccounts, updateWalletAccount } from './wallet'
import { refreshWalletAccounts } from './walletFresh'
import {
  appendLedgerEntries,
  ledgerEntry,
  rowToLedgerEntry,
  type LedgerEntry
} from './walletLedger'
import type { SavingsGoal, SavingsGoalView } from '../types'
import { getDateRange } from '../utils/dateRange'
import { roundMoney } from '../utils/roundMoney'

async function fetchGoalRows(
  spreadsheetId: string
): Promise<(SavingsGoal & { rowNumber: number })[]> {
  const rows = await fetchSheetRows(spreadsheetId, TREASURY_GOALS_SHEET)

  return rows.flatMap((row, index) => {
    const goal = rowToGoal(row)

    return goal ? [{ ...goal, rowNumber: index + 2 }] : []
  })
}

async function fetchLedgerEntries(spreadsheetId: string): Promise<LedgerEntry[]> {
  try {
    return (await fetchSheetRows(spreadsheetId, WALLET_LEDGER_SHEET)).map(rowToLedgerEntry)
  } catch {
    return []
  }
}

/** Every goal with its balance and this month's deposits; empty before the tab exists. */
export async function loadSavingsGoals(spreadsheetId: string): Promise<SavingsGoalView[]> {
  let goals: (SavingsGoal & { rowNumber: number })[]

  try {
    goals = await fetchGoalRows(spreadsheetId)
  } catch {
    return []
  }
  if (!goals.length) return []

  const ledger = await fetchLedgerEntries(spreadsheetId)
  const balances = goalBalances(ledger)
  const deposits = goalNetDepositsIn(ledger, getDateRange('month-to-date'))

  return goals.map(goal => ({
    ...goal,
    balance: balances.get(goal.id) ?? 0,
    monthDeposits: deposits.get(goal.id) ?? 0
  }))
}

/** What the goals add to «صندوقچه» (archived goals still hold their money). */
export function sumGoalBalances(goals: SavingsGoalView[]): number {
  return goals.reduce((sum, goal) => sum + Math.max(0, goal.balance), 0)
}

export async function saveSavingsGoal(
  spreadsheetId: string,
  goal: SavingsGoal,
  rowNumber?: number
): Promise<void> {
  await ensureSheetWithHeaders(spreadsheetId, TREASURY_GOALS_SHEET, TREASURY_GOALS_HEADERS)

  if (rowNumber)
    await updateSheetRow(spreadsheetId, TREASURY_GOALS_SHEET, rowNumber, goalToRow(goal))
  else await appendSheetRow(spreadsheetId, TREASURY_GOALS_SHEET, goalToRow(goal))

  // A goal that is no longer "reached" (target raised, archived, money taken out) forgets its
  // congratulation; reaching the target again earns a new one.
  if (goal.status !== 'reached') resetGoalCongrats(spreadsheetId, goal.id)
}

export interface GoalMoveInput {
  /** > 0 deposits into the goal, < 0 withdraws back to the account. */
  amount: number
  /** Wallet account the money leaves (or returns to); empty records the move only. */
  accountId: string
  date: string
}

/**
 * A deposit is one «گردش حساب» row on the wallet account (the account's balance
 * drops, the goal's rises); a withdrawal is the reverse. The ledger row is the
 * goal's balance, so it is written before the account balance.
 * Returns true when this move made the goal reach its target.
 */
export async function moveGoalMoney(
  spreadsheetId: string,
  goal: SavingsGoalView,
  { amount, accountId, date }: GoalMoveInput
): Promise<boolean> {
  if (!amount) return false

  const gone = accountId
    ? await refreshWalletAccounts(spreadsheetId, [accountId])
    : new Set<string>()

  const account = accountId
    ? (await fetchWalletAccounts(spreadsheetId)).find(
        item => item.id === accountId && !gone.has(item.id)
      )
    : undefined
  const delta = -amount
  const balanceAfter = roundMoney((account?.balance ?? 0) + delta)
  const title = amount > 0 ? `واریز به هدف «${goal.title}»` : `برداشت از هدف «${goal.title}»`

  await appendLedgerEntries(spreadsheetId, [
    ledgerEntry(
      account?.id ?? '',
      delta,
      balanceAfter,
      { title, date, source: GOAL_LEDGER_SOURCE, recordId: goal.id },
      !!account
    )
  ])
  if (account) {
    await updateWalletAccount(
      spreadsheetId,
      { ...account, balance: balanceAfter },
      { mergeBalance: true }
    )
  }
  logItemActivity(spreadsheetId, 'goal', 'goals', goal.id, goal.title, { amount })

  const balance = goal.balance + amount
  const status = nextGoalStatus(goal, balance)

  if (status === goal.status) return false

  await saveSavingsGoal(spreadsheetId, { ...stripView(goal), status }, goal.rowNumber)

  if (status !== 'reached') return false

  return queueGoalCongrats(spreadsheetId, goal)
}

export function stripView(goal: SavingsGoalView): SavingsGoal {
  const { rowNumber: _r, balance: _b, monthDeposits: _m, ...plain } = goal

  return plain
}

export async function exportSavingsGoalsCsv(spreadsheetId: string): Promise<string | null> {
  return exportSheetCsv(
    spreadsheetId,
    TREASURY_GOALS_SHEET,
    TREASURY_GOALS_HEADERS,
    'هدف-صندوقچه.csv'
  )
}

export async function importSavingsGoalsCsv(spreadsheetId: string, csvContent: string) {
  return importSheetCsv(
    spreadsheetId,
    TREASURY_GOALS_SHEET,
    TREASURY_GOALS_HEADERS,
    csvContent,
    cells => {
      const goal = rowToGoal([
        newImportId(cells[0] ?? ''),
        newImportTimestamp(cells[1] ?? ''),
        ...validateSavingsGoalCsvCells(cells).slice(2)
      ])

      return goal ? goalToRow(goal) : null
    }
  )
}
