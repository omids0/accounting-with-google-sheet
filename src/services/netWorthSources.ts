import type { ChartsRecords } from './chartsData'
import { fetchChecks } from './checks'
import { fetchDangs } from './dang'
import { getDateFieldId } from './dashboardAggregation'
import { getDashboardBundle } from './dashboardBundle'
import { fetchInstallmentPlans } from './installments'
import { vaultEventText, type NetWorthEvent } from './netWorthReason'
import type { NetWorthRebuildInput } from './netWorthRebuild'
import type { NetWorthValues } from './netWorthTrend'
import { aggregateMonthlyNet } from './openingBalanceDerive'
import { fetchReceivables } from './receivables'
import { GOAL_LEDGER_SOURCE } from './savingsGoals'
import { loadSavingsGoals, sumGoalBalances } from './savingsGoalsSheet'
import { getNetAvailableConfig } from './settings'
import { WALLET_LEDGER_SHEET } from './sheetNames'
import { fetchRecords, fetchSheetRows } from './sheets'
import { ensureVaultPrices } from './tgjuCurrency'
import { fetchVaultTransactions } from './treasury'
import { getAssetClassLabel, resolveVaultAsset } from './treasuryCatalog'
import { loadVaultCatalog } from './treasuryCatalogSheet'
import { fetchWalletAccounts } from './wallet'
import { rowToLedgerEntry } from './walletLedger'
import type { AppSettings, VaultTransaction } from '../types'
import { getInstallmentDueRange, resolveDateRange } from '../utils/dateRange'

/** Today's values, and the live-priced vault assets missing a quote (so the vault part is a floor). */
export type TodayNetWorth = NetWorthValues & { vaultUnquoted: string[] }

/** Today's «دارایی قابل اتکا», from the same (cached) bundle the dashboard shows. */
export async function loadTodayNetWorth(settings: AppSettings): Promise<TodayNetWorth> {
  const range = resolveDateRange('month-to-date')
  const bundle = await getDashboardBundle(
    settings,
    range,
    getInstallmentDueRange('month-to-date'),
    getNetAvailableConfig()
  )
  const { netAvailable, totalAssets, totalLiabilities, treasuryUnquoted } = bundle.data.financial

  return {
    netWorth: netAvailable,
    assets: totalAssets,
    liabilities: totalLiabilities,
    vaultUnquoted: treasuryUnquoted ?? []
  }
}

export async function loadNetWorthRecords(settings: AppSettings): Promise<ChartsRecords> {
  const incomeForm = settings.forms.find(form => form.type === 'income')
  const expenseForm = settings.forms.find(form => form.type === 'expense')
  const [incomeRecords, expenseRecords] = await Promise.all([
    incomeForm ? fetchRecords(settings.spreadsheetId, incomeForm) : Promise.resolve([]),
    expenseForm ? fetchRecords(settings.spreadsheetId, expenseForm) : Promise.resolve([])
  ])

  return {
    incomeRecords,
    expenseRecords,
    incomeDateField: getDateFieldId(incomeForm),
    expenseDateField: getDateFieldId(expenseForm)
  }
}

async function loadVault(spreadsheetId: string): Promise<VaultTransaction[]> {
  try {
    const [transactions] = await Promise.all([
      fetchVaultTransactions(spreadsheetId),
      loadVaultCatalog(spreadsheetId)
    ])

    return transactions
  } catch {
    return []
  }
}

/** Vault trades and goal transfers, named for the reason lines. */
export async function loadNetWorthEvents(spreadsheetId: string): Promise<NetWorthEvent[]> {
  const [vault, ledgerRows] = await Promise.all([
    loadVault(spreadsheetId),
    fetchSheetRows(spreadsheetId, WALLET_LEDGER_SHEET).catch(() => [])
  ])

  const vaultEvents = vault.map(tx => ({
    date: tx.transactionDate,
    text: vaultEventText(tx.action, getAssetClassLabel(resolveVaultAsset(tx.assetType).assetClass))
  }))
  const goalEvents = ledgerRows
    .map(rowToLedgerEntry)
    .filter(entry => entry.source === GOAL_LEDGER_SOURCE && entry.title)
    .map(entry => ({ date: entry.date, text: entry.title }))

  return [...vaultEvents, ...goalEvents]
}

/** Today's balances and the dated history the one-time rebuild works back from. */
export async function loadRebuildInput(
  settings: AppSettings,
  records: ChartsRecords
): Promise<NetWorthRebuildInput> {
  const id = settings.spreadsheetId
  const [wallet, vaultTransactions, receivables, installmentPlans, checks, dangs, goals] =
    await Promise.all([
      fetchWalletAccounts(id).catch(() => []),
      loadVault(id),
      fetchReceivables(id).catch(() => []),
      fetchInstallmentPlans(id).catch(() => []),
      fetchChecks(id).catch(() => []),
      fetchDangs(id).catch(() => []),
      loadSavingsGoals(id).catch(() => [])
    ])

  return {
    walletTotal: wallet.reduce((sum, account) => sum + account.balance, 0),
    monthlyNet: aggregateMonthlyNet(
      records.incomeRecords,
      records.expenseRecords,
      records.incomeDateField,
      records.expenseDateField
    ),
    vaultTransactions,
    // After the catalog loads, so user-added assets and manual prices count; null when tgju is unreachable.
    prices: await ensureVaultPrices(vaultTransactions),
    goalsTotal: sumGoalBalances(goals),
    receivables,
    installmentPlans,
    checks,
    dangs
  }
}
