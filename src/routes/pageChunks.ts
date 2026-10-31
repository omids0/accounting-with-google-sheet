import type { ComponentType } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PageLoader = () => Promise<{ default: ComponentType<any> }>

export const loadAboutPage: PageLoader = () => import('../components/about/AboutPage')
export const loadInvitePage: PageLoader = () => import('../components/invite/InvitePage')

export const loadChartsPage: PageLoader = () => import('../components/chartsPage/ChartsPage')

export const loadChecksPage: PageLoader = () => import('../components/ChecksPage')

export const loadCounterpartiesPage: PageLoader = () => import('../components/CounterpartiesPage')

export const loadCurrencyConverterPage: PageLoader = () =>
  import('../components/CurrencyConverterPage')

export const loadDangPage: PageLoader = () => import('../components/DangPage')

export const loadDangSplitPage: PageLoader = () => import('../components/dangSplit/DangSplitPage')

export const loadDangSplitDetailPage: PageLoader = () =>
  import('../components/dangSplit/DangSplitDetailPage')

export const loadDashboardPage: PageLoader = () => import('../components/DashboardPage')

export const loadDataEntryPage: PageLoader = () => import('../components/DataEntryPage')

export const loadDateCalculatorPage: PageLoader = () => import('../components/DateCalculatorPage')

export const loadInstallmentsPage: PageLoader = () => import('../components/InstallmentsPage')

export const loadLoanRequestCalculatorPage: PageLoader = () =>
  import('../components/LoanRequestCalculatorPage')

export const loadNetAvailableSettingsPage: PageLoader = () =>
  import('../components/NetAvailableSettingsPage')

export const loadOnboardingWizard: PageLoader = () =>
  import('../components/onboarding/OnboardingWizard')

export const loadOpeningBalancePage: PageLoader = () => import('../components/OpeningBalancePage')

export const loadReceivablesPage: PageLoader = () => import('../components/ReceivablesPage')

export const loadRecordsPage: PageLoader = () => import('../components/RecordsPage')

export const loadAssetsLiabilitiesReportPage: PageLoader = () =>
  import('../components/reports/AssetsLiabilitiesReportPage')

export const loadCashFlowReportPage: PageLoader = () =>
  import('../components/reports/CashFlowReportPage')

export const loadCashForecastPage: PageLoader = () =>
  import('../components/forecast/CashForecastPage')

export const loadDueDatesReportPage: PageLoader = () =>
  import('../components/reports/DueDatesReportPage')

export const loadFinancialSummaryReportPage: PageLoader = () =>
  import('../components/reports/FinancialSummaryReportPage')

export const loadIncomeExpenseReportPage: PageLoader = () =>
  import('../components/reports/IncomeExpenseReportPage')

export const loadCategoryTreeReportPage: PageLoader = () =>
  import('../components/reports/CategoryTreeReportPage')

export const loadLineItemsReportPage: PageLoader = () =>
  import('../components/reports/LineItemsReportPage')

export const loadCounterpartiesReportPage: PageLoader = () =>
  import('../components/reports/CounterpartiesReportPage')

export const loadLineItemPage: PageLoader = () => import('../components/reports/LineItemPage')

export const loadModuleReportPage: PageLoader = () =>
  import('../components/reports/ModuleReportPage')

export const loadMonthlyReportPage: PageLoader = () =>
  import('../components/reports/monthly/MonthlyReportPage')

export const loadYearsReportPage: PageLoader = () =>
  import('../components/reports/years/YearsReportPage')

export const loadOpeningBalanceReportPage: PageLoader = () =>
  import('../components/reports/OpeningBalanceReportPage')

export const loadPersonalRemindersPage: PageLoader = () =>
  import('../components/PersonalRemindersPage')

export const loadRemindersPage: PageLoader = () => import('../components/RemindersPage')

export const loadCategoriesPage: PageLoader = () =>
  import('../components/categories/CategoriesPage')

export const loadCloseYearPage: PageLoader = () => import('../components/closeYear/CloseYearPage')

export const loadBackupPage: PageLoader = () => import('../components/settings/backup/BackupPage')

export const loadActivityPage: PageLoader = () => import('../components/activity/ActivityPage')

export const loadSettingsPage: PageLoader = () => import('../components/SettingsPage')

export const loadTimesheetDetailPage: PageLoader = () => import('../components/TimesheetDetailPage')

export const loadTimesheetsPage: PageLoader = () => import('../components/TimesheetsPage')

export const loadVehicleDetailPage: PageLoader = () =>
  import('../components/vehicles/VehicleDetailPage')

export const loadVehiclesPage: PageLoader = () => import('../components/VehiclesPage')

export const loadTreasuryPage: PageLoader = () => import('../components/TreasuryPage')

export const loadWalletPage: PageLoader = () => import('../components/WalletPage')

export const loadWalletAccountDetailPage: PageLoader = () =>
  import('../components/wallet/WalletAccountDetailPage')

export const loadWalletReconcilePage: PageLoader = () =>
  import('../components/wallet/reconcile/WalletReconcilePage')

export const loadWalletTracePage: PageLoader = () =>
  import('../components/wallet/trace/WalletTracePage')

export const loadWalletTransfersPage: PageLoader = () =>
  import('../components/wallet/transfers/WalletTransfersPage')

export const loadBuildingReportsPage: PageLoader = () =>
  import('../components/buildings/BuildingReportsPage')

export const loadBuildingSettingsPage: PageLoader = () =>
  import('../components/buildings/BuildingSettingsPage')

export const loadBuildingMembersPage: PageLoader = () =>
  import('../components/buildings/BuildingMembersPage')

export const loadBuildingListsPage: PageLoader = () =>
  import('../components/buildings/BuildingListsPage')

export const loadBuildingFundPage: PageLoader = () =>
  import('../components/buildings/BuildingFundPage')

export const loadBuildingDangPage: PageLoader = () =>
  import('../components/buildings/BuildingDangPage')

export const loadBuildingChecksPage: PageLoader = () =>
  import('../components/buildings/BuildingChecksPage')

export const loadBuildingCounterpartiesPage: PageLoader = () =>
  import('../components/buildings/BuildingCounterpartiesPage')

export const loadBuildingsHomePage: PageLoader = () =>
  import('../components/buildings/BuildingsHomePage')

export const loadBuildingJourneyPage: PageLoader = () =>
  import('../components/buildings/BuildingJourneyPage')

export const loadBuildingDashboardPage: PageLoader = () =>
  import('../components/buildings/BuildingDashboardPage')

export const loadBuildingUnitsPage: PageLoader = () =>
  import('../components/buildings/BuildingUnitsPage')

export const loadBuildingResidentsPage: PageLoader = () =>
  import('../components/buildings/BuildingResidentsPage')

export const loadBuildingChargesPage: PageLoader = () =>
  import('../components/buildings/BuildingChargesPage')

export const loadBuildingUnitPage: PageLoader = () =>
  import('../components/buildings/BuildingUnitPage')

export const loadBuildingExpensesPage: PageLoader = () =>
  import('../components/buildings/BuildingExpensesPage')

export const loadSharedHomePage: PageLoader = () => import('../components/shared/SharedHomePage')

export const loadSharedRecordsPage: PageLoader = () =>
  import('../components/shared/SharedRecordsPage')

export const loadSharedSettlePage: PageLoader = () =>
  import('../components/shared/SharedSettlePage')

export const loadSharedMembersPage: PageLoader = () =>
  import('../components/shared/SharedMembersRoute')

export const loadBankSmsPage: PageLoader = () => import('../components/bankSms/BankSmsPage')

export const loadSearchPage: PageLoader = () => import('../components/search/SearchPage')

export const TAB_PAGE_LOADERS: Record<string, PageLoader> = {
  dashboard: loadDashboardPage,
  charts: loadChartsPage,
  installments: loadInstallmentsPage,
  dang: loadDangPage,
  checks: loadChecksPage,
  'personal-reminders': loadPersonalRemindersPage,
  counterparties: loadCounterpartiesPage,
  receivables: loadReceivablesPage,
  treasury: loadTreasuryPage,
  wallet: loadWalletPage,
  'wallet-account-detail': loadWalletAccountDetailPage,
  'wallet-reconcile': loadWalletReconcilePage,
  'wallet-trace': loadWalletTracePage,
  'wallet-transfers': loadWalletTransfersPage,
  'bank-sms': loadBankSmsPage,
  search: loadSearchPage,
  records: loadRecordsPage,
  entry: loadDataEntryPage,
  'opening-balances': loadOpeningBalancePage,
  'net-available-settings': loadNetAvailableSettingsPage,
  about: loadAboutPage,
  invite: loadInvitePage,
  'loan-calculator': loadLoanRequestCalculatorPage,
  'currency-converter': loadCurrencyConverterPage,
  'date-calculator': loadDateCalculatorPage,
  'report-financial-summary': loadFinancialSummaryReportPage,
  'report-income-expense': loadIncomeExpenseReportPage,
  'report-category-tree': loadCategoryTreeReportPage,
  'report-line-items': loadLineItemsReportPage,
  'report-line-item': loadLineItemPage,
  'report-counterparties': loadCounterpartiesReportPage,
  'report-cash-flow': loadCashFlowReportPage,
  'report-due-dates': loadDueDatesReportPage,
  'report-forecast': loadCashForecastPage,
  'report-assets-liabilities': loadAssetsLiabilitiesReportPage,
  'report-opening-balances': loadOpeningBalanceReportPage,
  'report-wallet': loadModuleReportPage,
  'report-treasury': loadModuleReportPage,
  'report-receivables': loadModuleReportPage,
  'report-dang': loadModuleReportPage,
  'report-installments': loadModuleReportPage,
  'report-checks': loadModuleReportPage,
  'report-monthly': loadMonthlyReportPage,
  'report-years': loadYearsReportPage,
  timesheets: loadTimesheetsPage,
  'timesheet-detail': loadTimesheetDetailPage,
  'vehicle-service': loadVehiclesPage,
  'vehicle-detail': loadVehicleDetailPage,
  'dang-split': loadDangSplitPage,
  'dang-split-detail': loadDangSplitDetailPage
}
