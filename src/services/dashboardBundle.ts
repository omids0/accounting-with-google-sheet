import type { AppSettings, DashboardData, NetAvailableConfig } from '../types'
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
import { fetchInstallmentPlans, totalUnpaidInstallments } from './installments'
import {
  ensureAutoOpeningBalanceForCurrentMonth,
  fetchOpeningBalance,
  hasUserOpeningBalance
} from './monthlyBalance'
import { fetchReceivables, remainingAmount } from './receivables'
import { getDefaultNetAvailableConfig } from './settings'
import { fetchRecords } from './sheets'
import { notifySpreadsheetDataChanged } from './spreadsheetDataChange'
import { getCachedTgjuPrices } from './tgju'
import { computeHoldings, fetchVaultTransactions } from './treasury'
import { fetchWalletAccounts } from './wallet'
import { formatJalaliMonthLabel, getDateRange, getJalaliMonthKey } from '../utils/dateRange'
import type { DateRange } from '../utils/dateRange'
import { parseNumeric } from '../utils/parseNumeric'

async function fetchDashboardBundleUncached(
  settings: AppSettings,
  range: DateRange,
  installmentRange: DateRange = range,
  netAvailableConfig: NetAvailableConfig = getDefaultNetAvailableConfig()
): Promise<DashboardBundle> {
  const incomeForm = settings.forms.find(f => f.type === 'income')

  const expenseForm = settings.forms.find(f => f.type === 'expense')

  const monthKey = getJalaliMonthKey(range.start)

  const tgjuPrices = getCachedTgjuPrices()

  const shouldFetchVault = netAvailableConfig.assets.treasury && tgjuPrices != null

  const [
    incomeRecords,
    expenseRecords,
    walletAccounts,
    vaultTransactions,
    receivables,
    installmentPlans,
    checks,
    dangs,
    openingBalanceRecord
  ] = await Promise.all([
    incomeForm ? fetchRecords(settings.spreadsheetId, incomeForm) : Promise.resolve([]),
    expenseForm ? fetchRecords(settings.spreadsheetId, expenseForm) : Promise.resolve([]),
    fetchWalletAccounts(settings.spreadsheetId).catch(() => []),
    shouldFetchVault
      ? fetchVaultTransactions(settings.spreadsheetId).catch(() => [])
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
    }))
  ])

  const incomeDateField = getDateFieldId(incomeForm)

  const expenseDateField = getDateFieldId(expenseForm)

  const currentMonthKey = getJalaliMonthKey(getDateRange('month-to-date').start)

  const resolvedOpeningBalance = openingBalanceRecord

  if (monthKey === currentMonthKey && !hasUserOpeningBalance(openingBalanceRecord)) {
    const walletTotal = walletAccounts.reduce((s, a) => s + a.balance, 0)

    void ensureAutoOpeningBalanceForCurrentMonth(settings.spreadsheetId, walletTotal).then(
      autoFilled => {
        if (!autoFilled) return
        notifySpreadsheetDataChanged(settings.spreadsheetId)
      }
    )
  }

  const filteredIncome = filterByDateRange(incomeRecords, range, incomeDateField)

  const filteredExpense = filterByDateRange(expenseRecords, range, expenseDateField)

  const totalIncome = filteredIncome.reduce((s, r) => s + parseNumeric(r.values.amount), 0)

  const totalExpense = filteredExpense.reduce((s, r) => s + parseNumeric(r.values.amount), 0)

  const walletTotal = walletAccounts.reduce((s, a) => s + a.balance, 0)

  const holdings = tgjuPrices ? computeHoldings(vaultTransactions, tgjuPrices) : []

  const treasuryTotal = holdings.reduce((s, h) => s + h.totalValue, 0)

  const receivablesTotal = receivables.reduce((s, r) => s + remainingAmount(r), 0)

  const installmentsDue = totalUnpaidInstallments(installmentPlans, installmentRange)

  const checksDue = totalUnpaidChecksInRange(checks, installmentRange)

  const dangsTotal = unpaidDangTotal(dangs)

  const rawFinancial = {
    walletTotal,
    treasuryTotal,
    receivablesTotal,
    installmentsDue,
    dangsTotal,
    checksDue
  }

  const { totalAssets, totalLiabilities, netAvailable } = applyNetAvailableConfig(
    rawFinancial,
    netAvailableConfig
  )

  const openingBalance = resolvedOpeningBalance.amount

  const periodBalance = openingBalance + totalIncome - totalExpense

  const reconciliationDiff = walletTotal - periodBalance

  const recent = [
    ...filteredIncome.map(r => ({
      formName: incomeForm?.name ?? 'درآمد',
      title: r.values.title || '—',
      amount: parseNumeric(r.values.amount),
      type: 'income' as const,
      category: r.values.category || 'سایر',
      date: r.values[incomeDateField] ?? '',
      createdAt: r.createdAt
    })),
    ...filteredExpense.map(r => ({
      formName: expenseForm?.name ?? 'هزینه',
      title: r.values.title || '—',
      amount: parseNumeric(r.values.amount),
      type: 'expense' as const,
      category: r.values.category || 'سایر',
      date: r.values[expenseDateField] ?? '',
      createdAt: r.createdAt
    }))
  ]
    .sort((a, b) => {
      const byDate = (b.date || '').localeCompare(a.date || '')

      if (byDate !== 0) return byDate

      return (b.createdAt || '').localeCompare(a.createdAt || '')
    })
    .map(({ createdAt: _, ...record }) => record)

  return {
    expiresAt: Date.now() + DASHBOARD_CACHE_TTL_MS,
    incomeRecords,
    expenseRecords,
    incomeDateField,
    expenseDateField,
    data: {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
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
