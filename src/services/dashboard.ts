import type {
  AppSettings,
  CategorySummary,
  CustomForm,
  DashboardData,
  FinancialSummary,
  MonthlyFlow,
  NetAvailableConfig
} from '../types'
import { fetchChecks, totalUnpaidChecksInRange } from './checks'
import { fetchDangs, unpaidDangTotal } from './dang'
import {
  fetchInstallmentPlans,
  invalidateInstallmentsCache,
  totalUnpaidInstallments
} from './installments'
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
import {
  formatJalaliMonthLabel,
  getDateRange,
  getJalaliMonthKey,
  getJalaliYearRange,
  isDateInRange
} from '../utils/dateRange'
import type { DateRange } from '../utils/dateRange'
import { getJalaliParts } from '../utils/jalaliDate'
import { parseNumeric } from '../utils/parseNumeric'
import { normalizeSheetDate } from '../utils/sheetValues'

export function applyNetAvailableConfig(
  financial: Omit<FinancialSummary, 'totalAssets' | 'totalLiabilities' | 'netAvailable'>,
  config: NetAvailableConfig = getDefaultNetAvailableConfig()
): Pick<FinancialSummary, 'totalAssets' | 'totalLiabilities' | 'netAvailable'> {
  const totalAssets =
    (config.assets.wallet ? financial.walletTotal : 0) +
    (config.assets.treasury ? financial.treasuryTotal : 0) +
    (config.assets.receivables ? financial.receivablesTotal : 0)

  const totalLiabilities =
    (config.liabilities.installments ? financial.installmentsDue : 0) +
    (config.liabilities.dangs ? financial.dangsTotal : 0) +
    (config.liabilities.checks ? financial.checksDue : 0)

  return {
    totalAssets,
    totalLiabilities,
    netAvailable: totalAssets - totalLiabilities
  }
}

function getDateFieldId(form: CustomForm | undefined): string {
  return form?.fields.find(f => f.type === 'date')?.id ?? 'date'
}

function filterByDateRange<T extends { values: Record<string, string> }>(
  records: T[],
  range: DateRange,
  dateFieldId: string
): T[] {
  return records.filter(r => isDateInRange(r.values[dateFieldId] ?? '', range))
}

function aggregateYearToDateMonthlyFlow(
  year: number,
  incomeRecords: { values: Record<string, string> }[],
  expenseRecords: { values: Record<string, string> }[],
  incomeDateField: string,
  expenseDateField: string
): MonthlyFlow[] {
  const range = getJalaliYearRange(year)

  const totals = new Map<string, { income: number; expense: number }>()

  for (const record of incomeRecords) {
    const date = normalizeSheetDate(record.values[incomeDateField] ?? '')

    if (!date || !isDateInRange(date, range)) continue

    const monthKey = getJalaliMonthKey(date)

    const entry = totals.get(monthKey) ?? { income: 0, expense: 0 }

    entry.income += parseNumeric(record.values.amount)
    totals.set(monthKey, entry)
  }

  for (const record of expenseRecords) {
    const date = normalizeSheetDate(record.values[expenseDateField] ?? '')

    if (!date || !isDateInRange(date, range)) continue

    const monthKey = getJalaliMonthKey(date)

    const entry = totals.get(monthKey) ?? { income: 0, expense: 0 }

    entry.expense += parseNumeric(record.values.amount)
    totals.set(monthKey, entry)
  }

  const { year: currentYear, month: currentMonth } = getJalaliParts(new Date())

  const maxMonth = year < currentYear ? 12 : year === currentYear ? currentMonth : 0

  const flow: MonthlyFlow[] = []

  for (let month = 1; month <= maxMonth; month += 1) {
    const monthKey = `${year}-${String(month).padStart(2, '0')}`

    const { income = 0, expense = 0 } = totals.get(monthKey) ?? {}

    flow.push({
      monthKey,
      label: formatJalaliMonthLabel(monthKey),
      income,
      expense,
      net: income - expense
    })
  }

  return flow
}

function sumByCategory(
  records: { values: Record<string, string> }[],
  amountKey = 'amount',
  categoryKey = 'category'
): CategorySummary[] {
  const map = new Map<string, number>()

  for (const r of records) {
    const amount = parseNumeric(r.values[amountKey])

    const cat = r.values[categoryKey] || 'سایر'

    map.set(cat, (map.get(cat) ?? 0) + amount)
  }

  return Array.from(map.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
}

const DASHBOARD_CACHE_TTL_MS = 30_000

const dashboardCache = new Map<string, { expiresAt: number; data: DashboardData }>()

const dashboardInFlight = new Map<string, Promise<DashboardData>>()

interface DashboardBundle {
  expiresAt: number
  incomeRecords: { values: Record<string, string> }[]
  expenseRecords: { values: Record<string, string> }[]
  incomeDateField: string
  expenseDateField: string
  data: Omit<DashboardData, 'yearlyMonthlyFlow'>
}

const dashboardBundleCache = new Map<string, DashboardBundle>()

const dashboardBundleInFlight = new Map<string, Promise<DashboardBundle>>()

function buildDashboardBundleCacheKey(
  settings: AppSettings,
  range: DateRange,
  installmentRange: DateRange,
  netAvailableConfig: NetAvailableConfig
): string {
  return JSON.stringify({
    spreadsheetId: settings.spreadsheetId,
    range,
    installmentRange,
    netAvailableConfig
  })
}

function buildDashboardCacheKey(
  settings: AppSettings,
  range: DateRange,
  installmentRange: DateRange,
  monthlyFlowYear: number,
  netAvailableConfig: NetAvailableConfig
): string {
  return JSON.stringify({
    spreadsheetId: settings.spreadsheetId,
    range,
    installmentRange,
    monthlyFlowYear,
    netAvailableConfig
  })
}

export function buildDashboardYearlyMonthlyFlow(
  settings: AppSettings,
  range: DateRange,
  installmentRange: DateRange,
  netAvailableConfig: NetAvailableConfig,
  monthlyFlowYear: number
): MonthlyFlow[] | null {
  const bundle = dashboardBundleCache.get(
    buildDashboardBundleCacheKey(settings, range, installmentRange, netAvailableConfig)
  )

  if (!bundle || Date.now() > bundle.expiresAt) return null

  return aggregateYearToDateMonthlyFlow(
    monthlyFlowYear,
    bundle.incomeRecords,
    bundle.expenseRecords,
    bundle.incomeDateField,
    bundle.expenseDateField
  )
}

export function invalidateDashboardCache(spreadsheetId?: string): void {
  if (!spreadsheetId) {
    dashboardCache.clear()
    dashboardInFlight.clear()
    dashboardBundleCache.clear()
    dashboardBundleInFlight.clear()
    invalidateInstallmentsCache()

    return
  }

  for (const key of dashboardCache.keys()) {
    if (key.includes(spreadsheetId)) dashboardCache.delete(key)
  }
  for (const key of dashboardInFlight.keys()) {
    if (key.includes(spreadsheetId)) dashboardInFlight.delete(key)
  }
  for (const key of dashboardBundleCache.keys()) {
    if (key.includes(spreadsheetId)) dashboardBundleCache.delete(key)
  }
  for (const key of dashboardBundleInFlight.keys()) {
    if (key.includes(spreadsheetId)) dashboardBundleInFlight.delete(key)
  }
  invalidateInstallmentsCache(spreadsheetId)
}

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

function assembleDashboardData(bundle: DashboardBundle, monthlyFlowYear: number): DashboardData {
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

async function getDashboardBundle(
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

export async function loadDashboardData(
  settings: AppSettings,
  range: DateRange,
  installmentRange: DateRange = range,
  monthlyFlowYear: number = getJalaliParts(new Date()).year,
  netAvailableConfig: NetAvailableConfig = getDefaultNetAvailableConfig()
): Promise<DashboardData> {
  const cacheKey = buildDashboardCacheKey(
    settings,
    range,
    installmentRange,
    monthlyFlowYear,
    netAvailableConfig
  )

  const cached = dashboardCache.get(cacheKey)

  if (cached && Date.now() < cached.expiresAt) {
    return cached.data
  }

  const inFlight = dashboardInFlight.get(cacheKey)

  if (inFlight) return inFlight

  const task = getDashboardBundle(settings, range, installmentRange, netAvailableConfig)
    .then(bundle => {
      const data = assembleDashboardData(bundle, monthlyFlowYear)

      dashboardCache.set(cacheKey, {
        data,
        expiresAt: Date.now() + DASHBOARD_CACHE_TTL_MS
      })

      return data
    })
    .finally(() => {
      dashboardInFlight.delete(cacheKey)
    })

  dashboardInFlight.set(cacheKey, task)

  return task
}

export function peekCachedDashboardData(
  settings: AppSettings,
  range: DateRange,
  installmentRange: DateRange = range,
  monthlyFlowYear: number = getJalaliParts(new Date()).year,
  netAvailableConfig: NetAvailableConfig = getDefaultNetAvailableConfig()
): DashboardData | null {
  const cacheKey = buildDashboardCacheKey(
    settings,
    range,
    installmentRange,
    monthlyFlowYear,
    netAvailableConfig
  )

  const cached = dashboardCache.get(cacheKey)

  if (cached && Date.now() < cached.expiresAt) {
    return cached.data
  }

  return null
}
