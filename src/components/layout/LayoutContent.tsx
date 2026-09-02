import type { Timesheet } from '../../types'
import AboutPage from '../about/AboutPage'
import ChecksPage from '../ChecksPage'
import CurrencyConverterPage from '../CurrencyConverterPage'
import DangPage from '../DangPage'
import DashboardPage from '../DashboardPage'
import DataEntryPage from '../DataEntryPage'
import DateCalculatorPage from '../DateCalculatorPage'
import InstallmentsPage from '../InstallmentsPage'
import LoanRequestCalculatorPage from '../LoanRequestCalculatorPage'
import NetAvailableSettingsPage from '../NetAvailableSettingsPage'
import OpeningBalancePage from '../OpeningBalancePage'
import ReceivablesPage from '../ReceivablesPage'
import RecordsPage from '../RecordsPage'
import AssetsLiabilitiesReportPage from '../reports/AssetsLiabilitiesReportPage'
import CashFlowReportPage from '../reports/CashFlowReportPage'
import DueDatesReportPage from '../reports/DueDatesReportPage'
import FinancialSummaryReportPage from '../reports/FinancialSummaryReportPage'
import IncomeExpenseReportPage from '../reports/IncomeExpenseReportPage'
import ModuleReportPage from '../reports/ModuleReportPage'
import OpeningBalanceReportPage from '../reports/OpeningBalanceReportPage'
import SettingsPage from '../SettingsPage'
import TimesheetDetailPage from '../TimesheetDetailPage'
import TimesheetsPage from '../TimesheetsPage'
import TreasuryPage from '../TreasuryPage'
import WalletPage from '../WalletPage'
import TabPanel from './TabPanel'
import type { Tab } from './types'

interface LayoutContentProps {
  showSettings: boolean
  onLogout: () => void
  onReauth: () => void
  dataKey: number
  onDataKeyChange: () => void
  tab: Tab
  recordsFormType: 'income' | 'expense' | undefined
  entryFormType: 'income' | 'expense' | undefined
  selectedTimesheet: Timesheet | null
  onTabChange: (tab: Tab) => void
  onOpenRecords: (formType?: 'income' | 'expense') => void
  onOpenEntry: (formType?: 'income' | 'expense') => void
  onOpenTimesheetDetail: (timesheet: Timesheet) => void
}

export default function LayoutContent({
  showSettings,
  onLogout,
  onReauth,
  dataKey,
  onDataKeyChange,
  tab,
  recordsFormType,
  entryFormType,
  selectedTimesheet,
  onTabChange,
  onOpenRecords,
  onOpenEntry,
  onOpenTimesheetDetail
}: LayoutContentProps) {
  return (
    <main className="app-main">
      <div key={showSettings ? 'settings' : String(dataKey)} className="page-content">
        {showSettings ? (
          <SettingsPage onLogout={onLogout} onSpreadsheetChange={onDataKeyChange} />
        ) : (
          <>
            <TabPanel active={tab === 'dashboard'}>
              <DashboardPage
                active={tab === 'dashboard'}
                onReauth={onReauth}
                onViewRecords={onOpenRecords}
                onNewEntry={onOpenEntry}
                onNavigate={onTabChange}
                onConfigureNetAvailable={() => onTabChange('net-available-settings')}
              />
            </TabPanel>
            <TabPanel active={tab === 'installments'}>
              <InstallmentsPage onReauth={onReauth} active={tab === 'installments'} />
            </TabPanel>
            <TabPanel active={tab === 'dang'}>
              <DangPage onReauth={onReauth} active={tab === 'dang'} />
            </TabPanel>
            <TabPanel active={tab === 'checks'}>
              <ChecksPage onReauth={onReauth} active={tab === 'checks'} />
            </TabPanel>
            <TabPanel active={tab === 'receivables'}>
              <ReceivablesPage onReauth={onReauth} active={tab === 'receivables'} />
            </TabPanel>
            <TabPanel active={tab === 'treasury'}>
              <TreasuryPage onReauth={onReauth} active={tab === 'treasury'} />
            </TabPanel>
            <TabPanel active={tab === 'wallet'}>
              <WalletPage
                onReauth={onReauth}
                active={tab === 'wallet'}
                onOpenOpeningBalances={() => onTabChange('opening-balances')}
              />
            </TabPanel>
            {tab === 'entry' && (
              <DataEntryPage
                onReauth={onReauth}
                initialFormType={entryFormType}
                onCancel={() => onTabChange('dashboard')}
              />
            )}
            {tab === 'records' && (
              <RecordsPage onReauth={onReauth} initialFormType={recordsFormType} />
            )}
            {tab === 'opening-balances' && <OpeningBalancePage onReauth={onReauth} />}
            {tab === 'net-available-settings' && <NetAvailableSettingsPage onReauth={onReauth} />}
            {tab === 'loan-calculator' && <LoanRequestCalculatorPage />}
            {tab === 'currency-converter' && <CurrencyConverterPage />}
            {tab === 'date-calculator' && <DateCalculatorPage />}
            {tab === 'about' && <AboutPage />}
            {tab === 'report-financial-summary' && (
              <FinancialSummaryReportPage onReauth={onReauth} />
            )}
            {tab === 'report-income-expense' && <IncomeExpenseReportPage onReauth={onReauth} />}
            {tab === 'report-cash-flow' && <CashFlowReportPage onReauth={onReauth} />}
            {tab === 'report-due-dates' && <DueDatesReportPage onReauth={onReauth} />}
            {tab === 'report-assets-liabilities' && (
              <AssetsLiabilitiesReportPage onReauth={onReauth} />
            )}
            {tab === 'report-opening-balances' && <OpeningBalanceReportPage onReauth={onReauth} />}
            {tab === 'report-wallet' && <ModuleReportPage kind="wallet" onReauth={onReauth} />}
            {tab === 'report-treasury' && <ModuleReportPage kind="treasury" onReauth={onReauth} />}
            {tab === 'report-receivables' && (
              <ModuleReportPage kind="receivables" onReauth={onReauth} />
            )}
            {tab === 'report-dang' && <ModuleReportPage kind="dang" onReauth={onReauth} />}
            {tab === 'report-installments' && (
              <ModuleReportPage kind="installments" onReauth={onReauth} />
            )}
            {tab === 'report-checks' && <ModuleReportPage kind="checks" onReauth={onReauth} />}
            <TabPanel active={tab === 'timesheets'}>
              <TimesheetsPage
                onReauth={onReauth}
                active={tab === 'timesheets'}
                onOpenTimesheet={onOpenTimesheetDetail}
              />
            </TabPanel>
            {tab === 'timesheet-detail' && selectedTimesheet && (
              <TimesheetDetailPage
                timesheet={selectedTimesheet}
                onReauth={onReauth}
                active={tab === 'timesheet-detail'}
              />
            )}
            {tab === 'timesheet-detail' && !selectedTimesheet && (
              <div className="empty-state">
                <p>تایم‌شیت یافت نشد</p>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => onTabChange('timesheets')}
                >
                  بازگشت به لیست
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
