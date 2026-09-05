import type { ComponentType } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PageLoader = () => Promise<{ default: ComponentType<any> }>

export const loadAboutPage: PageLoader = () => import('../components/about/AboutPage')

export const loadChecksPage: PageLoader = () => import('../components/ChecksPage')

export const loadCurrencyConverterPage: PageLoader = () =>
  import('../components/CurrencyConverterPage')

export const loadDangPage: PageLoader = () => import('../components/DangPage')

export const loadDashboardPage: PageLoader = () => import('../components/DashboardPage')

export const loadDataEntryPage: PageLoader = () => import('../components/DataEntryPage')

export const loadDateCalculatorPage: PageLoader = () => import('../components/DateCalculatorPage')

export const loadInstallmentsPage: PageLoader = () => import('../components/InstallmentsPage')

export const loadLoanRequestCalculatorPage: PageLoader = () =>
  import('../components/LoanRequestCalculatorPage')

export const loadNetAvailableSettingsPage: PageLoader = () =>
  import('../components/NetAvailableSettingsPage')

export const loadOpeningBalancePage: PageLoader = () => import('../components/OpeningBalancePage')

export const loadReceivablesPage: PageLoader = () => import('../components/ReceivablesPage')

export const loadRecordsPage: PageLoader = () => import('../components/RecordsPage')

export const loadAssetsLiabilitiesReportPage: PageLoader = () =>
  import('../components/reports/AssetsLiabilitiesReportPage')

export const loadCashFlowReportPage: PageLoader = () =>
  import('../components/reports/CashFlowReportPage')

export const loadDueDatesReportPage: PageLoader = () =>
  import('../components/reports/DueDatesReportPage')

export const loadFinancialSummaryReportPage: PageLoader = () =>
  import('../components/reports/FinancialSummaryReportPage')

export const loadIncomeExpenseReportPage: PageLoader = () =>
  import('../components/reports/IncomeExpenseReportPage')

export const loadModuleReportPage: PageLoader = () =>
  import('../components/reports/ModuleReportPage')

export const loadOpeningBalanceReportPage: PageLoader = () =>
  import('../components/reports/OpeningBalanceReportPage')

export const loadPersonalRemindersPage: PageLoader = () =>
  import('../components/PersonalRemindersPage')

export const loadRemindersPage: PageLoader = () => import('../components/RemindersPage')

export const loadSettingsPage: PageLoader = () => import('../components/SettingsPage')

export const loadTimesheetDetailPage: PageLoader = () => import('../components/TimesheetDetailPage')

export const loadTimesheetsPage: PageLoader = () => import('../components/TimesheetsPage')

export const loadTreasuryPage: PageLoader = () => import('../components/TreasuryPage')

export const loadWalletPage: PageLoader = () => import('../components/WalletPage')

export const TAB_PAGE_LOADERS: Record<string, PageLoader> = {
  dashboard: loadDashboardPage,
  installments: loadInstallmentsPage,
  dang: loadDangPage,
  checks: loadChecksPage,
  'personal-reminders': loadPersonalRemindersPage,
  receivables: loadReceivablesPage,
  treasury: loadTreasuryPage,
  wallet: loadWalletPage,
  records: loadRecordsPage,
  entry: loadDataEntryPage,
  'opening-balances': loadOpeningBalancePage,
  'net-available-settings': loadNetAvailableSettingsPage,
  about: loadAboutPage,
  'loan-calculator': loadLoanRequestCalculatorPage,
  'currency-converter': loadCurrencyConverterPage,
  'date-calculator': loadDateCalculatorPage,
  'report-financial-summary': loadFinancialSummaryReportPage,
  'report-income-expense': loadIncomeExpenseReportPage,
  'report-cash-flow': loadCashFlowReportPage,
  'report-due-dates': loadDueDatesReportPage,
  'report-assets-liabilities': loadAssetsLiabilitiesReportPage,
  'report-opening-balances': loadOpeningBalanceReportPage,
  'report-wallet': loadModuleReportPage,
  'report-treasury': loadModuleReportPage,
  'report-receivables': loadModuleReportPage,
  'report-dang': loadModuleReportPage,
  'report-installments': loadModuleReportPage,
  'report-checks': loadModuleReportPage,
  timesheets: loadTimesheetsPage,
  'timesheet-detail': loadTimesheetDetailPage
}
