import { lazy } from 'react'

import {
  loadAboutPage,
  loadAssetsLiabilitiesReportPage,
  loadCashFlowReportPage,
  loadCategoryTreeReportPage,
  loadChartsPage,
  loadChecksPage,
  loadCounterpartiesPage,
  loadCurrencyConverterPage,
  loadDangPage,
  loadDangSplitDetailPage,
  loadDangSplitPage,
  loadDashboardPage,
  loadDataEntryPage,
  loadDateCalculatorPage,
  loadDueDatesReportPage,
  loadFinancialSummaryReportPage,
  loadIncomeExpenseReportPage,
  loadInstallmentsPage,
  loadLoanRequestCalculatorPage,
  loadModuleReportPage,
  loadMonthlyReportPage,
  loadYearsReportPage,
  loadNetAvailableSettingsPage,
  loadOnboardingWizard,
  loadOpeningBalancePage,
  loadOpeningBalanceReportPage,
  loadPersonalRemindersPage,
  loadReceivablesPage,
  loadRecordsPage,
  loadRemindersPage,
  loadCategoriesPage,
  loadSettingsPage,
  loadTimesheetDetailPage,
  loadTimesheetsPage,
  loadVehicleDetailPage,
  loadVehiclesPage,
  loadTreasuryPage,
  loadWalletPage,
  loadWalletAccountDetailPage,
  loadWalletReconcilePage,
  loadBankSmsPage,
  loadSearchPage
} from './pageChunks'

export const LazyAboutPage = lazy(loadAboutPage)
export const LazyBankSmsPage = lazy(loadBankSmsPage)
export const LazyChartsPage = lazy(loadChartsPage)
export const LazyChecksPage = lazy(loadChecksPage)
export const LazyCounterpartiesPage = lazy(loadCounterpartiesPage)
export const LazyCurrencyConverterPage = lazy(loadCurrencyConverterPage)
export const LazyDangPage = lazy(loadDangPage)
export const LazyDangSplitPage = lazy(loadDangSplitPage)
export const LazyDangSplitDetailPage = lazy(loadDangSplitDetailPage)
export const LazyDashboardPage = lazy(loadDashboardPage)
export const LazyDataEntryPage = lazy(loadDataEntryPage)
export const LazyDateCalculatorPage = lazy(loadDateCalculatorPage)
export const LazyInstallmentsPage = lazy(loadInstallmentsPage)
export const LazyLoanRequestCalculatorPage = lazy(loadLoanRequestCalculatorPage)
export const LazyNetAvailableSettingsPage = lazy(loadNetAvailableSettingsPage)
export const LazyOnboardingWizard = lazy(loadOnboardingWizard)
export const LazyOpeningBalancePage = lazy(loadOpeningBalancePage)
export const LazyReceivablesPage = lazy(loadReceivablesPage)
export const LazyRecordsPage = lazy(loadRecordsPage)
export const LazyAssetsLiabilitiesReportPage = lazy(loadAssetsLiabilitiesReportPage)
export const LazyCashFlowReportPage = lazy(loadCashFlowReportPage)
export const LazyCategoryTreeReportPage = lazy(loadCategoryTreeReportPage)
export const LazyDueDatesReportPage = lazy(loadDueDatesReportPage)
export const LazyFinancialSummaryReportPage = lazy(loadFinancialSummaryReportPage)
export const LazyIncomeExpenseReportPage = lazy(loadIncomeExpenseReportPage)
export const LazyModuleReportPage = lazy(loadModuleReportPage)
export const LazyMonthlyReportPage = lazy(loadMonthlyReportPage)
export const LazyYearsReportPage = lazy(loadYearsReportPage)
export const LazyOpeningBalanceReportPage = lazy(loadOpeningBalanceReportPage)
export const LazyPersonalRemindersPage = lazy(loadPersonalRemindersPage)
export const LazyRemindersPage = lazy(loadRemindersPage)
export const LazyCategoriesPage = lazy(loadCategoriesPage)
export const LazySettingsPage = lazy(loadSettingsPage)
export const LazyTimesheetDetailPage = lazy(loadTimesheetDetailPage)
export const LazyTimesheetsPage = lazy(loadTimesheetsPage)
export const LazyVehicleDetailPage = lazy(loadVehicleDetailPage)
export const LazyVehiclesPage = lazy(loadVehiclesPage)
export const LazyTreasuryPage = lazy(loadTreasuryPage)
export const LazyWalletPage = lazy(loadWalletPage)
export const LazyWalletAccountDetailPage = lazy(loadWalletAccountDetailPage)
export const LazyWalletReconcilePage = lazy(loadWalletReconcilePage)
export const LazySearchPage = lazy(loadSearchPage)
