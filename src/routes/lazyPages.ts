import { lazy } from 'react'

export const LazyAboutPage = lazy(() => import('../components/about/AboutPage'))
export const LazyChecksPage = lazy(() => import('../components/ChecksPage'))
export const LazyCurrencyConverterPage = lazy(() => import('../components/CurrencyConverterPage'))
export const LazyDangPage = lazy(() => import('../components/DangPage'))
export const LazyDashboardPage = lazy(() => import('../components/DashboardPage'))
export const LazyDataEntryPage = lazy(() => import('../components/DataEntryPage'))
export const LazyDateCalculatorPage = lazy(() => import('../components/DateCalculatorPage'))
export const LazyInstallmentsPage = lazy(() => import('../components/InstallmentsPage'))
export const LazyLoanRequestCalculatorPage = lazy(
  () => import('../components/LoanRequestCalculatorPage')
)
export const LazyNetAvailableSettingsPage = lazy(
  () => import('../components/NetAvailableSettingsPage')
)
export const LazyOpeningBalancePage = lazy(() => import('../components/OpeningBalancePage'))
export const LazyReceivablesPage = lazy(() => import('../components/ReceivablesPage'))
export const LazyRecordsPage = lazy(() => import('../components/RecordsPage'))
export const LazyAssetsLiabilitiesReportPage = lazy(
  () => import('../components/reports/AssetsLiabilitiesReportPage')
)
export const LazyCashFlowReportPage = lazy(() => import('../components/reports/CashFlowReportPage'))
export const LazyDueDatesReportPage = lazy(() => import('../components/reports/DueDatesReportPage'))
export const LazyFinancialSummaryReportPage = lazy(
  () => import('../components/reports/FinancialSummaryReportPage')
)
export const LazyIncomeExpenseReportPage = lazy(
  () => import('../components/reports/IncomeExpenseReportPage')
)
export const LazyModuleReportPage = lazy(() => import('../components/reports/ModuleReportPage'))
export const LazyOpeningBalanceReportPage = lazy(
  () => import('../components/reports/OpeningBalanceReportPage')
)
export const LazySettingsPage = lazy(() => import('../components/SettingsPage'))
export const LazyTimesheetDetailPage = lazy(() => import('../components/TimesheetDetailPage'))
export const LazyTimesheetsPage = lazy(() => import('../components/TimesheetsPage'))
export const LazyTreasuryPage = lazy(() => import('../components/TreasuryPage'))
export const LazyWalletPage = lazy(() => import('../components/WalletPage'))
