import { lazy } from 'react'

import {
  loadAboutPage,
  loadInvitePage,
  loadAssetsLiabilitiesReportPage,
  loadCashFlowReportPage,
  loadCategoryTreeReportPage,
  loadCounterpartiesReportPage,
  loadLineItemPage,
  loadLineItemsReportPage,
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
  loadActivityPage,
  loadCloseYearPage,
  loadBackupPage,
  loadSettingsPage,
  loadTimesheetDetailPage,
  loadTimesheetsPage,
  loadVehicleDetailPage,
  loadVehiclesPage,
  loadTreasuryPage,
  loadWalletPage,
  loadWalletAccountDetailPage,
  loadWalletReconcilePage,
  loadWalletTracePage,
  loadWalletTransfersPage,
  loadBankSmsPage,
  loadBuildingChargesPage,
  loadBuildingChecksPage,
  loadBuildingCounterpartiesPage,
  loadBuildingDangPage,
  loadBuildingFundPage,
  loadBuildingDashboardPage,
  loadBuildingExpensesPage,
  loadBuildingJourneyPage,
  loadBuildingListsPage,
  loadBuildingMembersPage,
  loadBuildingReportsPage,
  loadBuildingResidentsPage,
  loadBuildingSettingsPage,
  loadBuildingsHomePage,
  loadBuildingUnitPage,
  loadBuildingUnitsPage,
  loadSearchPage,
  loadSharedHomePage,
  loadSharedMembersPage,
  loadSharedRecordsPage,
  loadSharedSettlePage
} from './pageChunks'

export const LazyAboutPage = lazy(loadAboutPage)
export const LazyInvitePage = lazy(loadInvitePage)
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
export const LazyLineItemsReportPage = lazy(loadLineItemsReportPage)
export const LazyLineItemPage = lazy(loadLineItemPage)
export const LazyCounterpartiesReportPage = lazy(loadCounterpartiesReportPage)
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
export const LazyCloseYearPage = lazy(loadCloseYearPage)
export const LazyBackupPage = lazy(loadBackupPage)
export const LazyActivityPage = lazy(loadActivityPage)
export const LazySettingsPage = lazy(loadSettingsPage)
export const LazyTimesheetDetailPage = lazy(loadTimesheetDetailPage)
export const LazyTimesheetsPage = lazy(loadTimesheetsPage)
export const LazyVehicleDetailPage = lazy(loadVehicleDetailPage)
export const LazyVehiclesPage = lazy(loadVehiclesPage)
export const LazyTreasuryPage = lazy(loadTreasuryPage)
export const LazyWalletPage = lazy(loadWalletPage)
export const LazyWalletAccountDetailPage = lazy(loadWalletAccountDetailPage)
export const LazyWalletReconcilePage = lazy(loadWalletReconcilePage)
export const LazyWalletTracePage = lazy(loadWalletTracePage)
export const LazyWalletTransfersPage = lazy(loadWalletTransfersPage)
export const LazySearchPage = lazy(loadSearchPage)
export const LazyBuildingReportsPage = lazy(loadBuildingReportsPage)
export const LazyBuildingSettingsPage = lazy(loadBuildingSettingsPage)
export const LazyBuildingMembersPage = lazy(loadBuildingMembersPage)
export const LazyBuildingListsPage = lazy(loadBuildingListsPage)
export const LazyBuildingFundPage = lazy(loadBuildingFundPage)
export const LazyBuildingDangPage = lazy(loadBuildingDangPage)
export const LazyBuildingChecksPage = lazy(loadBuildingChecksPage)
export const LazyBuildingCounterpartiesPage = lazy(loadBuildingCounterpartiesPage)
export const LazyBuildingsHomePage = lazy(loadBuildingsHomePage)
export const LazyBuildingJourneyPage = lazy(loadBuildingJourneyPage)
export const LazyBuildingDashboardPage = lazy(loadBuildingDashboardPage)
export const LazyBuildingUnitsPage = lazy(loadBuildingUnitsPage)
export const LazyBuildingUnitPage = lazy(loadBuildingUnitPage)
export const LazyBuildingChargesPage = lazy(loadBuildingChargesPage)
export const LazyBuildingExpensesPage = lazy(loadBuildingExpensesPage)
export const LazyBuildingResidentsPage = lazy(loadBuildingResidentsPage)
export const LazySharedHomePage = lazy(loadSharedHomePage)
export const LazySharedRecordsPage = lazy(loadSharedRecordsPage)
export const LazySharedSettlePage = lazy(loadSharedSettlePage)
export const LazySharedMembersPage = lazy(loadSharedMembersPage)
