import { lazy } from 'react'

import {
  loadAboutPage,
  loadAssetsLiabilitiesReportPage,
  loadCashFlowReportPage,
  loadChecksPage,
  loadCurrencyConverterPage,
  loadDangPage,
  loadDashboardPage,
  loadDataEntryPage,
  loadDateCalculatorPage,
  loadDueDatesReportPage,
  loadFinancialSummaryReportPage,
  loadIncomeExpenseReportPage,
  loadInstallmentsPage,
  loadLoanRequestCalculatorPage,
  loadModuleReportPage,
  loadNetAvailableSettingsPage,
  loadOpeningBalancePage,
  loadOpeningBalanceReportPage,
  loadPersonalRemindersPage,
  loadReceivablesPage,
  loadRecordsPage,
  loadRemindersPage,
  loadSettingsPage,
  loadTimesheetDetailPage,
  loadTimesheetsPage,
  loadTreasuryPage,
  loadWalletPage
} from './pageChunks'

export const LazyAboutPage = lazy(loadAboutPage)
export const LazyChecksPage = lazy(loadChecksPage)
export const LazyCurrencyConverterPage = lazy(loadCurrencyConverterPage)
export const LazyDangPage = lazy(loadDangPage)
export const LazyDashboardPage = lazy(loadDashboardPage)
export const LazyDataEntryPage = lazy(loadDataEntryPage)
export const LazyDateCalculatorPage = lazy(loadDateCalculatorPage)
export const LazyInstallmentsPage = lazy(loadInstallmentsPage)
export const LazyLoanRequestCalculatorPage = lazy(loadLoanRequestCalculatorPage)
export const LazyNetAvailableSettingsPage = lazy(loadNetAvailableSettingsPage)
export const LazyOpeningBalancePage = lazy(loadOpeningBalancePage)
export const LazyReceivablesPage = lazy(loadReceivablesPage)
export const LazyRecordsPage = lazy(loadRecordsPage)
export const LazyAssetsLiabilitiesReportPage = lazy(loadAssetsLiabilitiesReportPage)
export const LazyCashFlowReportPage = lazy(loadCashFlowReportPage)
export const LazyDueDatesReportPage = lazy(loadDueDatesReportPage)
export const LazyFinancialSummaryReportPage = lazy(loadFinancialSummaryReportPage)
export const LazyIncomeExpenseReportPage = lazy(loadIncomeExpenseReportPage)
export const LazyModuleReportPage = lazy(loadModuleReportPage)
export const LazyOpeningBalanceReportPage = lazy(loadOpeningBalanceReportPage)
export const LazyPersonalRemindersPage = lazy(loadPersonalRemindersPage)
export const LazyRemindersPage = lazy(loadRemindersPage)
export const LazySettingsPage = lazy(loadSettingsPage)
export const LazyTimesheetDetailPage = lazy(loadTimesheetDetailPage)
export const LazyTimesheetsPage = lazy(loadTimesheetsPage)
export const LazyTreasuryPage = lazy(loadTreasuryPage)
export const LazyWalletPage = lazy(loadWalletPage)
