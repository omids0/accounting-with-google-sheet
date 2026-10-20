import { Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router'

import DangSplitDetailRoute from './DangSplitDetailRoute'
import {
  LazyAboutPage,
  LazyBankSmsPage,
  LazyBuildingPlaceholderPage,
  LazyChartsPage,
  LazyChecksPage,
  LazyCounterpartiesPage,
  LazyCurrencyConverterPage,
  LazyDangPage,
  LazyDangSplitPage,
  LazyDashboardPage,
  LazyDataEntryPage,
  LazyDateCalculatorPage,
  LazyInstallmentsPage,
  LazyLoanRequestCalculatorPage,
  LazyNetAvailableSettingsPage,
  LazyOpeningBalancePage,
  LazyReceivablesPage,
  LazySearchPage,
  LazyRecordsPage,
  LazyAssetsLiabilitiesReportPage,
  LazyCashFlowReportPage,
  LazyDueDatesReportPage,
  LazyFinancialSummaryReportPage,
  LazyCategoryTreeReportPage,
  LazyLineItemsReportPage,
  LazyCounterpartiesReportPage,
  LazyIncomeExpenseReportPage,
  LazyModuleReportPage,
  LazyMonthlyReportPage,
  LazyYearsReportPage,
  LazyOpeningBalanceReportPage,
  LazyPersonalRemindersPage,
  LazyRemindersPage,
  LazyCategoriesPage,
  LazyCloseYearPage,
  LazyBackupPage,
  LazyActivityPage,
  LazySettingsPage,
  LazyTimesheetsPage,
  LazyTreasuryPage,
  LazyVehiclesPage,
  LazyWalletPage,
  LazyWalletReconcilePage
} from './lazyPages'
import LineItemRoute from './LineItemRoute'
import {
  RECORD_COUNTERPARTY_PARAM,
  RECORD_EDIT_PARAM,
  RECORD_FOCUS_PARAM,
  RECORD_OPEN_PARAM,
  RECORD_FROM_PARAM,
  RECORD_TO_PARAM
} from './paths'
import TimesheetDetailRoute from './TimesheetDetailRoute'
import VehicleDetailRoute from './VehicleDetailRoute'
import WalletAccountDetailRoute from './WalletAccountDetailRoute'
import WorkspaceRouteGuard from './WorkspaceRouteGuard'
import Layout from '../components/Layout'
import OnboardingGate from '../components/onboarding/OnboardingGate'
import type { ModuleReportKind } from '../components/reports/ModuleReportPage'
import { readBankSmsEntryDraft } from '../services/bankSmsEntryDraft'
import { readEntryDraft } from '../services/entryDraft'

function parseFormType(value: string | null): 'income' | 'expense' | undefined {
  if (value === 'income' || value === 'expense') return value

  return undefined
}

function RecordsRoute() {
  const [searchParams] = useSearchParams()

  const from = searchParams.get(RECORD_FROM_PARAM)

  const to = searchParams.get(RECORD_TO_PARAM)

  return (
    <LazyRecordsPage
      initialFormType={parseFormType(searchParams.get('type'))}
      focusRecordId={searchParams.get(RECORD_FOCUS_PARAM) ?? undefined}
      openEdit={searchParams.get(RECORD_EDIT_PARAM) === '1'}
      openDetail={searchParams.get(RECORD_OPEN_PARAM) === '1'}
      initialCounterparty={searchParams.get(RECORD_COUNTERPARTY_PARAM) ?? undefined}
      initialRange={from && to ? { start: from, end: to } : undefined}
    />
  )
}

function EntryRoute() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const smsDraft = readBankSmsEntryDraft(location.state)
  const draft = smsDraft ?? readEntryDraft(location.state)
  // Opened pre-filled (bank SMS card, account history): go back there, and drop the form from history.
  const back = () => (draft ? navigate(-1) : navigate('/'))

  return (
    <LazyDataEntryPage
      initialFormType={draft?.formType ?? parseFormType(searchParams.get('type'))}
      onCancel={back}
      prefill={draft?.prefill}
      bankSms={smsDraft?.bankSms}
      onSaved={draft ? back : undefined}
      hideTemplates={!!draft}
    />
  )
}

/** Building pages (round 11); each step swaps its own element for the real page. */
const BUILDING_ROUTE_PATHS = [
  'buildings',
  'building',
  'building/units',
  'building/units/:unitId',
  'building/residents',
  'building/charges',
  'building/expenses',
  'building/fund',
  'building/dang',
  'building/checks',
  'building/counterparties',
  'building/sms',
  'building/reports',
  'building/settings',
  'building/settings/members',
  'building/settings/lists'
]

function ModuleReportRoute({ kind }: { kind: ModuleReportKind }) {
  return <LazyModuleReportPage kind={kind} />
}

export function AppAuthenticatedRoutes() {
  return (
    <OnboardingGate>
      <Routes>
        <Route element={<Layout />}>
          <Route element={<WorkspaceRouteGuard />}>
            <Route index element={<LazyDashboardPage />} />
            <Route path="charts" element={<LazyChartsPage />} />
            <Route path="installments" element={<LazyInstallmentsPage />} />
            <Route path="dang" element={<LazyDangPage />} />
            <Route path="checks" element={<LazyChecksPage />} />
            <Route path="reminders" element={<LazyPersonalRemindersPage />} />
            <Route path="counterparties" element={<LazyCounterpartiesPage />} />
            <Route path="receivables" element={<LazyReceivablesPage />} />
            <Route path="treasury" element={<LazyTreasuryPage />} />
            <Route path="wallet" element={<LazyWalletPage />} />
            <Route path="bank-sms" element={<LazyBankSmsPage />} />
            <Route path="search" element={<LazySearchPage />} />
            <Route path="wallet/opening-balances" element={<LazyOpeningBalancePage />} />
            <Route path="wallet/:accountId" element={<WalletAccountDetailRoute />} />
            <Route path="wallet/reconcile/:accountId" element={<LazyWalletReconcilePage />} />
            <Route path="net-available-settings" element={<LazyNetAvailableSettingsPage />} />
            <Route path="entry" element={<EntryRoute />} />
            <Route path="records" element={<RecordsRoute />} />
            <Route path="calculators/loan" element={<LazyLoanRequestCalculatorPage />} />
            <Route path="calculators/currency" element={<LazyCurrencyConverterPage />} />
            <Route path="calculators/date" element={<LazyDateCalculatorPage />} />
            <Route path="about" element={<LazyAboutPage />} />
            <Route path="settings/reminders" element={<LazyRemindersPage />} />
            <Route path="settings/categories" element={<LazyCategoriesPage />} />
            <Route path="settings/close-year/:year?" element={<LazyCloseYearPage />} />
            <Route path="settings/backup" element={<LazyBackupPage />} />
            <Route path="settings/activity" element={<LazyActivityPage />} />
            <Route path="settings" element={<LazySettingsPage />} />
            <Route path="reports/financial-summary" element={<LazyFinancialSummaryReportPage />} />
            <Route path="reports/income-expense" element={<LazyIncomeExpenseReportPage />} />
            <Route path="reports/category-tree" element={<LazyCategoryTreeReportPage />} />
            <Route path="reports/line-items" element={<LazyLineItemsReportPage />} />
            <Route path="reports/line-items/:itemKey" element={<LineItemRoute />} />
            <Route path="reports/counterparties" element={<LazyCounterpartiesReportPage />} />
            <Route path="reports/cash-flow" element={<LazyCashFlowReportPage />} />
            <Route path="reports/due-dates" element={<LazyDueDatesReportPage />} />
            <Route
              path="reports/assets-liabilities"
              element={<LazyAssetsLiabilitiesReportPage />}
            />
            <Route path="reports/opening-balances" element={<LazyOpeningBalanceReportPage />} />
            <Route path="reports/wallet" element={<ModuleReportRoute kind="wallet" />} />
            <Route path="reports/treasury" element={<ModuleReportRoute kind="treasury" />} />
            <Route path="reports/receivables" element={<ModuleReportRoute kind="receivables" />} />
            <Route path="reports/dang" element={<ModuleReportRoute kind="dang" />} />
            <Route
              path="reports/installments"
              element={<ModuleReportRoute kind="installments" />}
            />
            <Route path="reports/checks" element={<ModuleReportRoute kind="checks" />} />
            <Route path="reports/monthly" element={<LazyMonthlyReportPage />} />
            <Route path="reports/years" element={<LazyYearsReportPage />} />
            <Route path="timesheets" element={<LazyTimesheetsPage />} />
            <Route path="timesheets/:timesheetId" element={<TimesheetDetailRoute />} />
            <Route path="vehicles" element={<LazyVehiclesPage />} />
            <Route path="vehicles/:vehicleId" element={<VehicleDetailRoute />} />
            <Route path="dang-split" element={<LazyDangSplitPage />} />
            <Route path="dang-split/:groupId" element={<DangSplitDetailRoute />} />
            {BUILDING_ROUTE_PATHS.map(path => (
              <Route key={path} path={path} element={<LazyBuildingPlaceholderPage />} />
            ))}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
    </OnboardingGate>
  )
}
