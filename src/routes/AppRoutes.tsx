import { Navigate, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom'

import Layout from '../components/Layout'
import RemindersPage from '../components/RemindersPage'
import type { ModuleReportKind } from '../components/reports/ModuleReportPage'
import type { Timesheet } from '../types'
import { useLayoutOutletContext } from './layoutOutletContext'
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
  LazySettingsPage,
  LazyTimesheetsPage,
  LazyTreasuryPage,
  LazyWalletPage
} from './lazyPages'
import TimesheetDetailRoute from './TimesheetDetailRoute'

function parseFormType(value: string | null): 'income' | 'expense' | undefined {
  if (value === 'income' || value === 'expense') return value

  return undefined
}

function DashboardRoute() {
  const { onReauth, onOpenRecords, onOpenEntry, onNavigateDashboard, onTabChange } =
    useLayoutOutletContext()

  return (
    <LazyDashboardPage
      onReauth={onReauth}
      onViewRecords={onOpenRecords}
      onNewEntry={onOpenEntry}
      onNavigate={onNavigateDashboard}
      onConfigureNetAvailable={() => onTabChange('net-available-settings')}
    />
  )
}

function RecordsRoute() {
  const [searchParams] = useSearchParams()
  const { onReauth } = useLayoutOutletContext()

  return (
    <LazyRecordsPage
      onReauth={onReauth}
      initialFormType={parseFormType(searchParams.get('type'))}
    />
  )
}

function EntryRoute() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { onReauth } = useLayoutOutletContext()

  return (
    <LazyDataEntryPage
      onReauth={onReauth}
      initialFormType={parseFormType(searchParams.get('type'))}
      onCancel={() => navigate('/')}
    />
  )
}

function WalletRoute() {
  const { onReauth, onTabChange } = useLayoutOutletContext()

  return (
    <LazyWalletPage
      onReauth={onReauth}
      onOpenOpeningBalances={() => onTabChange('opening-balances')}
    />
  )
}

function TimesheetsRoute() {
  const { onReauth, onTabChange } = useLayoutOutletContext()

  return (
    <LazyTimesheetsPage
      onReauth={onReauth}
      onOpenTimesheet={(timesheet: Timesheet) =>
        onTabChange('timesheet-detail', {
          timesheetId: timesheet.id,
          timesheetTitle: timesheet.title
        })
      }
    />
  )
}

function SettingsRoute() {
  const { onLogout, onDataKeyChange } = useLayoutOutletContext()

  return <LazySettingsPage onLogout={onLogout} onSpreadsheetChange={onDataKeyChange} />
}

function SettingsRemindersRoute() {
  return <RemindersPage />
}

function ModuleReportRoute({ kind }: { kind: ModuleReportKind }) {
  const { onReauth } = useLayoutOutletContext()

  return <LazyModuleReportPage kind={kind} onReauth={onReauth} />
}

function ReauthRoute({ Page }: { Page: React.ComponentType<{ onReauth?: () => void }> }) {
  const { onReauth } = useLayoutOutletContext()

  return <Page onReauth={onReauth} />
}

export function AppAuthenticatedRoutes({
  onLogout,
  onReauth
}: {
  onLogout: () => void
  onReauth: () => void
}) {
  return (
    <Routes>
      <Route element={<Layout onLogout={onLogout} onReauth={onReauth} />}>
        <Route index element={<DashboardRoute />} />
        <Route path="installments" element={<ReauthRoute Page={LazyInstallmentsPage} />} />
        <Route path="dang" element={<ReauthRoute Page={LazyDangPage} />} />
        <Route path="checks" element={<ReauthRoute Page={LazyChecksPage} />} />
        <Route path="receivables" element={<ReauthRoute Page={LazyReceivablesPage} />} />
        <Route path="treasury" element={<ReauthRoute Page={LazyTreasuryPage} />} />
        <Route path="wallet" element={<WalletRoute />} />
        <Route
          path="wallet/opening-balances"
          element={<ReauthRoute Page={LazyOpeningBalancePage} />}
        />
        <Route
          path="net-available-settings"
          element={<ReauthRoute Page={LazyNetAvailableSettingsPage} />}
        />
        <Route path="entry" element={<EntryRoute />} />
        <Route path="records" element={<RecordsRoute />} />
        <Route path="calculators/loan" element={<LazyLoanRequestCalculatorPage />} />
        <Route path="calculators/currency" element={<LazyCurrencyConverterPage />} />
        <Route path="calculators/date" element={<LazyDateCalculatorPage />} />
        <Route path="about" element={<LazyAboutPage />} />
        <Route path="settings/reminders" element={<SettingsRemindersRoute />} />
        <Route path="settings" element={<SettingsRoute />} />
        <Route
          path="reports/financial-summary"
          element={<ReauthRoute Page={LazyFinancialSummaryReportPage} />}
        />
        <Route
          path="reports/income-expense"
          element={<ReauthRoute Page={LazyIncomeExpenseReportPage} />}
        />
        <Route path="reports/cash-flow" element={<ReauthRoute Page={LazyCashFlowReportPage} />} />
        <Route path="reports/due-dates" element={<ReauthRoute Page={LazyDueDatesReportPage} />} />
        <Route
          path="reports/assets-liabilities"
          element={<ReauthRoute Page={LazyAssetsLiabilitiesReportPage} />}
        />
        <Route
          path="reports/opening-balances"
          element={<ReauthRoute Page={LazyOpeningBalanceReportPage} />}
        />
        <Route path="reports/wallet" element={<ModuleReportRoute kind="wallet" />} />
        <Route path="reports/treasury" element={<ModuleReportRoute kind="treasury" />} />
        <Route path="reports/receivables" element={<ModuleReportRoute kind="receivables" />} />
        <Route path="reports/dang" element={<ModuleReportRoute kind="dang" />} />
        <Route path="reports/installments" element={<ModuleReportRoute kind="installments" />} />
        <Route path="reports/checks" element={<ModuleReportRoute kind="checks" />} />
        <Route path="timesheets" element={<TimesheetsRoute />} />
        <Route path="timesheets/:timesheetId" element={<TimesheetDetailRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
