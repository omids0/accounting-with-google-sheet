import type { AppSettings, CustomForm, DashboardData, NetAvailableConfig } from '../types'
import { fetchChecks, totalUnpaidChecksInRange } from './checks'
import { fetchDangs, unpaidDangTotal } from './dang'
import {
  aggregateYearToDateMonthlyFlow,
  filterByDateRange,
  getDateFieldId,
  sumByCategory
} from './dashboardAggregation'
import {
  DASHBOARD_CACHE_TTL_MS,
  type DashboardBundle,
  buildDashboardBundleCacheKey,
  dashboardBundleCache,
  dashboardBundleInFlight
} from './dashboardCache'
import { applyNetAvailableConfig } from './dashboardNetAvailable'
import { buildRecentRecords } from './dashboardRecent'
import { fetchInstallmentPlans, totalUnpaidInstallments } from './installments'
import { summarizePreviousMonth } from './monthComparison'
import { fetchOpeningBalance } from './monthlyBalance'
import { resolveOpeningBalanceContext, syncDerivedOpeningBalances } from './openingBalanceService'
import { fetchReceivables, remainingAmount } from './receivables'
import { loadSavingsGoals, sumGoalBalances } from './savingsGoalsSheet'
import { getDefaultNetAvailableConfig } from './settings'
import { withoutSettlementRows } from './sharedSettlement'
import { fetchRecords } from './sheets'
import { getSummableTgjuPrices } from './tgjuCurrency'
import { fetchVaultTransactions } from './treasury'
import { loadVaultCatalog } from './treasuryCatalogSheet'
import { computeHoldings, totalsByClass } from './treasuryHoldings'
import { fetchWalletAccounts } from './wallet'
import { formatJalaliMonthLabel, getDateRange, getJalaliMonthKey } from '../utils/dateRange'
import type { DateRange } from '../utils/dateRange'
import { parseNumeric } from '../utils/parseNumeric'
import { roundMoney } from '../utils/roundMoney'

/** A form's records without a shared account's «تسویه», which is not income or spending. */
const fetchFlowRecords = async (spreadsheetId: string, form: CustomForm) =>
  withoutSettlementRows(await fetchRecords(spreadsheetId, form))

async function fetchDashboardBundleUncached(
  settings: AppSettings,
  range: DateRange,
  installmentRange: DateRange = range,
  netAvailableConfig: NetAvailableConfig = getDefaultNetAvailableConfig()
): Promise<DashboardBundle> {
  const incomeForm = settings.forms.find(f => f.type === 'income')

  const expenseForm = settings.forms.find(f => f.type === 'expense')

  const monthKey = getJalaliMonthKey(range.start)

  const shouldFetchVault = netAvailableConfig.assets.treasury && getSummableTgjuPrices() != null

  const [
    incomeRecords,
    expenseRecords,
    walletAccounts,
    vaultTransactions,
    receivables,
    installmentPlans,
    checks,
    dangs,
    storedOpeningBalance,
    goals
  ] = await Promise.all([
    incomeForm ? fetchFlowRecords(settings.spreadsheetId, incomeForm) : Promise.resolve([]),
    expenseForm ? fetchFlowRecords(settings.spreadsheetId, expenseForm) : Promise.resolve([]),
    fetchWalletAccounts(settings.spreadsheetId).catch(() => []),
    shouldFetchVault
      ? Promise.all([
          fetchVaultTransactions(settings.spreadsheetId),
          loadVaultCatalog(settings.spreadsheetId)
        ]).then(
          ([transactions]) => transactions,
          () => []
        )
      : Promise.resolve([]),
    fetchReceivables(settings.spreadsheetId).catch(() => []),
    fetchInstallmentPlans(settings.spreadsheetId).catch(() => []),
    fetchChecks(settings.spreadsheetId).catch(() => []),
    fetchDangs(settings.spreadsheetId).catch(() => []),
    fetchOpeningBalance(settings.spreadsheetId, monthKey).catch(() => ({
      monthKey,
      amount: 0,
      updatedAt: '',
      note: ''
    })),
    loadSavingsGoals(settings.spreadsheetId).catch(() => [])
  ])

  const incomeDateField = getDateFieldId(incomeForm)

  const expenseDateField = getDateFieldId(expenseForm)

  const currentMonthKey = getJalaliMonthKey(getDateRange('month-to-date').start)

  const openingContext = await resolveOpeningBalanceContext({
    spreadsheetId: settings.spreadsheetId,
    incomeRecords,
    expenseRecords,
    incomeDateField,
    expenseDateField,
    walletTotal: roundMoney(walletAccounts.reduce((s, a) => s + a.balance, 0)),
    currentMonthKey
  }).catch(() => null)

  if (openingContext) {
    void syncDerivedOpeningBalances(settings.spreadsheetId, openingContext).catch(() => {
      /* cache mirror only — derived values stay correct without it */
    })
  }

  const filteredIncome = filterByDateRange(incomeRecords, range, incomeDateField)

  const filteredExpense = filterByDateRange(expenseRecords, range, expenseDateField)

  const totalIncome = filteredIncome.reduce(
    (s, r) => roundMoney(s + parseNumeric(r.values.amount)),
    0
  )

  const totalExpense = filteredExpense.reduce(
    (s, r) => roundMoney(s + parseNumeric(r.values.amount)),
    0
  )

  const walletTotal = roundMoney(walletAccounts.reduce((s, a) => s + a.balance, 0))

  // After the catalog loads, so user-added tgju keys and manual prices count.
  const tgjuPrices = getSummableTgjuPrices()

  const holdings = tgjuPrices ? computeHoldings(vaultTransactions, tgjuPrices) : []

  const goalsTotal = sumGoalBalances(goals)

  // Goal balances are vault assets too; the net-available switch for them is separate.
  const treasuryTotal = holdings.reduce((s, h) => s + h.totalValue, 0) + goalsTotal

  const treasuryByClass = totalsByClass(holdings).map(({ assetClass, label, total }) => ({
    assetClass,
    label,
    total
  }))

  const receivablesTotal = receivables.reduce((s, r) => s + remainingAmount(r), 0)

  const installmentsDue = totalUnpaidInstallments(installmentPlans, installmentRange)

  // A payable check is a debt of this period; a received one is money coming in.
  const checksDue = totalUnpaidChecksInRange(checks, installmentRange, 'paid')

  const checksReceivable = totalUnpaidChecksInRange(checks, installmentRange, 'received')

  const dangsTotal = unpaidDangTotal(dangs)

  const rawFinancial = {
    walletTotal,
    treasuryTotal,
    treasuryByClass,
    goalsTotal,
    receivablesTotal,
    installmentsDue,
    dangsTotal,
    checksDue,
    checksReceivable
  }

  const { totalAssets, totalLiabilities, netAvailable } = applyNetAvailableConfig(
    rawFinancial,
    netAvailableConfig
  )

  // Months from the anchor onward are derived; anything older keeps the
  // historical value stored in «موجودی ماهانه».
  const openingBalance = openingContext?.openings.get(monthKey) ?? storedOpeningBalance.amount

  const periodBalance = roundMoney(openingBalance + totalIncome - totalExpense)

  const reconciliationDiff = roundMoney(walletTotal - periodBalance)

  const recent = buildRecentRecords(
    { records: filteredIncome, formName: incomeForm?.name ?? 'درآمد', dateField: incomeDateField },
    {
      records: filteredExpense,
      formName: expenseForm?.name ?? 'هزینه',
      dateField: expenseDateField
    },
    walletAccounts
  )

  return {
    expiresAt: Date.now() + DASHBOARD_CACHE_TTL_MS,
    incomeRecords,
    expenseRecords,
    incomeDateField,
    expenseDateField,
    data: {
      totalIncome,
      totalExpense,
      balance: roundMoney(totalIncome - totalExpense),
      openingBalance,
      periodBalance,
      reconciliationDiff,
      monthKey,
      monthLabel: formatJalaliMonthLabel(monthKey),
      financial: {
        ...rawFinancial,
        totalAssets,
        totalLiabilities,
        netAvailable
      },
      incomeByCategory: sumByCategory(filteredIncome),
      expenseByCategory: sumByCategory(filteredExpense),
      previousMonth: summarizePreviousMonth(
        { incomeRecords, expenseRecords, incomeDateField, expenseDateField },
        monthKey
      ),
      recentRecords: recent
    }
  }
}

export function assembleDashboardData(
  bundle: DashboardBundle,
  monthlyFlowYear: number
): DashboardData {
  return {
    ...bundle.data,
    yearlyMonthlyFlow: aggregateYearToDateMonthlyFlow(
      monthlyFlowYear,
      bundle.incomeRecords,
      bundle.expenseRecords,
      bundle.incomeDateField,
      bundle.expenseDateField
    )
  }
}

export async function getDashboardBundle(
  settings: AppSettings,
  range: DateRange,
  installmentRange: DateRange,
  netAvailableConfig: NetAvailableConfig
): Promise<DashboardBundle> {
  const bundleKey = buildDashboardBundleCacheKey(
    settings,
    range,
    installmentRange,
    netAvailableConfig
  )

  const cached = dashboardBundleCache.get(bundleKey)

  if (cached && Date.now() < cached.expiresAt) {
    return cached
  }

  const inFlight = dashboardBundleInFlight.get(bundleKey)

  if (inFlight) return inFlight

  const task = fetchDashboardBundleUncached(settings, range, installmentRange, netAvailableConfig)
    .then(bundle => {
      dashboardBundleCache.set(bundleKey, bundle)

      return bundle
    })
    .finally(() => {
      dashboardBundleInFlight.delete(bundleKey)
    })

  dashboardBundleInFlight.set(bundleKey, task)

  return task
}
