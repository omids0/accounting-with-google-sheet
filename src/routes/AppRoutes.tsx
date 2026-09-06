import { Navigate, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom'

import {
  LazyAboutPage,
  LazyChecksPage,
  LazyCurrencyConverterPage,
  LazyDangPage,
  LazyDashboardPage,
  LazyDataEntryPage,
  LazyDateCalculatorPage,
  LazyInstallmentsPage,
  LazyLoanRequestCalculatorPage,
  LazyNetAvailableSettingsPage,
  LazyOpeningBalancePage,
  LazyReceivablesPage,
  LazyRecordsPage,
  LazyAssetsLiabilitiesReportPage,
  LazyCashFlowReportPage,
  LazyDueDatesReportPage,
  LazyFinancialSummaryReportPage,
  LazyIncomeExpenseReportPage,
  LazyModuleReportPage,
  LazyOpeningBalanceReportPage,
  LazyPersonalRemindersPage,
  LazyRemindersPage,
  LazySettingsPage,
  LazyTimesheetsPage,
  LazyTreasuryPage,
  LazyWalletPage
} from './lazyPages'
import TimesheetDetailRoute from './TimesheetDetailRoute'
import Layout from '../components/Layout'
import type { ModuleReportKind } from '../components/reports/ModuleReportPage'

function parseFormType(value: string | null): 'income' | 'expense' | undefined {
  if (value === 'income' || value === 'expense') return value

  return undefined
}

function RecordsRoute() {
  const [searchParams] = useSearchParams()

  return <LazyRecordsPage initialFormType={parseFormType(searchParams.get('type'))} />
}

function EntryRoute() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  return (
    <LazyDataEntryPage
      initialFormType={parseFormType(searchParams.get('type'))}
      onCancel={() => navigate('/')}
    />
  )
}

function ModuleReportRoute({ kind }: { kind: ModuleReportKind }) {
  return <LazyModuleReportPage kind={kind} />
}

export function AppAuthenticatedRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<LazyDashboardPage />} />
        <Route path="installments" element={<LazyInstallmentsPage />} />
        <Route path="dang" element={<LazyDangPage />} />
        <Route path="checks" element={<LazyChecksPage />} />
        <Route path="reminders" element={<LazyPersonalRemindersPage />} />
        <Route path="receivables" element={<LazyReceivablesPage />} />
        <Route path="treasury" element={<LazyTreasuryPage />} />
        <Route path="wallet" element={<LazyWalletPage />} />
        <Route path="wallet/opening-balances" element={<LazyOpeningBalancePage />} />
        <Route path="net-available-settings" element={<LazyNetAvailableSettingsPage />} />
        <Route path="entry" element={<EntryRoute />} />
        <Route path="records" element={<RecordsRoute />} />
        <Route path="calculators/loan" element={<LazyLoanRequestCalculatorPage />} />
        <Route path="calculators/currency" element={<LazyCurrencyConverterPage />} />
        <Route path="calculators/date" element={<LazyDateCalculatorPage />} />
        <Route path="about" element={<LazyAboutPage />} />
        <Route path="settings/reminders" element={<LazyRemindersPage />} />
        <Route path="settings" element={<LazySettingsPage />} />
        <Route path="reports/financial-summary" element={<LazyFinancialSummaryReportPage />} />
        <Route path="reports/income-expense" element={<LazyIncomeExpenseReportPage />} />
        <Route path="reports/cash-flow" element={<LazyCashFlowReportPage />} />
        <Route path="reports/due-dates" element={<LazyDueDatesReportPage />} />
        <Route path="reports/assets-liabilities" element={<LazyAssetsLiabilitiesReportPage />} />
        <Route path="reports/opening-balances" element={<LazyOpeningBalanceReportPage />} />
        <Route path="reports/wallet" element={<ModuleReportRoute kind="wallet" />} />
        <Route path="reports/treasury" element={<ModuleReportRoute kind="treasury" />} />
        <Route path="reports/receivables" element={<ModuleReportRoute kind="receivables" />} />
        <Route path="reports/dang" element={<ModuleReportRoute kind="dang" />} />
        <Route path="reports/installments" element={<ModuleReportRoute kind="installments" />} />
        <Route path="reports/checks" element={<ModuleReportRoute kind="checks" />} />
        <Route path="timesheets" element={<LazyTimesheetsPage />} />
        <Route path="timesheets/:timesheetId" element={<TimesheetDetailRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
