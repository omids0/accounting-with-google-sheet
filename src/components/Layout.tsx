import { lazy, Suspense, useEffect, useState } from 'react';
import DashboardPage from './DashboardPage';
import DataEntryPage from './DataEntryPage';
import RecordsPage from './RecordsPage';
import DangPage from './DangPage';
import ChecksPage from './ChecksPage';
import ReceivablesPage from './ReceivablesPage';
import TreasuryPage from './TreasuryPage';
import WalletPage from './WalletPage';
import OpeningBalancePage from './OpeningBalancePage';
import NetAvailableSettingsPage from './NetAvailableSettingsPage';
import LoanRequestCalculatorPage from './LoanRequestCalculatorPage';
import CurrencyConverterPage from './CurrencyConverterPage';
import DateCalculatorPage from './DateCalculatorPage';
import FinancialSummaryReportPage from './reports/FinancialSummaryReportPage';
import IncomeExpenseReportPage from './reports/IncomeExpenseReportPage';
import CashFlowReportPage from './reports/CashFlowReportPage';
import DueDatesReportPage from './reports/DueDatesReportPage';
import AssetsLiabilitiesReportPage from './reports/AssetsLiabilitiesReportPage';
import OpeningBalanceReportPage from './reports/OpeningBalanceReportPage';
import ModuleReportPage from './reports/ModuleReportPage';
import SettingsPage from './SettingsPage';
import PageSpeedDial from './PageSpeedDial';
import AppIcon from './AppIcon';
import { InstallmentCardListSkeleton } from './skeleton';
import { getUserName, getUserPicture } from '../services/auth';
import { usePageSpeedDialConfig } from '../hooks/usePageSpeedDial';
import { useEngagementReminders } from '../hooks/useEngagementReminders';

const InstallmentsPage = lazy(() => import('./InstallmentsPage'));

type Tab =
  | 'dashboard'
  | 'entry'
  | 'records'
  | 'installments'
  | 'dang'
  | 'checks'
  | 'receivables'
  | 'treasury'
  | 'wallet'
  | 'opening-balances'
  | 'net-available-settings'
  | 'loan-calculator'
  | 'currency-converter'
  | 'date-calculator'
  | 'report-financial-summary'
  | 'report-income-expense'
  | 'report-cash-flow'
  | 'report-due-dates'
  | 'report-assets-liabilities'
  | 'report-opening-balances'
  | 'report-wallet'
  | 'report-treasury'
  | 'report-receivables'
  | 'report-dang'
  | 'report-installments'
  | 'report-checks';

const CALCULATION_TABS: Tab[] = ['loan-calculator', 'currency-converter', 'date-calculator'];

const REPORT_TABS: Tab[] = [
  'report-financial-summary',
  'report-income-expense',
  'report-cash-flow',
  'report-due-dates',
  'report-assets-liabilities',
  'report-opening-balances',
  'report-wallet',
  'report-treasury',
  'report-receivables',
  'report-dang',
  'report-installments',
  'report-checks',
];

const SPEED_DIAL_TABS: Tab[] = [
  'installments',
  'dang',
  'checks',
  'receivables',
  'treasury',
  'wallet',
];

interface LayoutProps {
  onLogout: () => void;
  onReauth: () => void;
}

export default function Layout({ onLogout, onReauth }: LayoutProps) {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [showSettings, setShowSettings] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [calcMenuExpanded, setCalcMenuExpanded] = useState(false);
  const [reportsMenuExpanded, setReportsMenuExpanded] = useState(false);
  const [dataKey, setDataKey] = useState(0);
  const [installmentsMounted, setInstallmentsMounted] = useState(false);
  const userName = getUserName();
  const userPicture = getUserPicture();

  const titles: Record<Tab, string> = {
    dashboard: 'داشبورد',
    entry: 'ثبت جدید',
    records: 'رکوردها',
    installments: 'اقساط',
    dang: 'بدهی',
    checks: 'چک‌ها',
    receivables: 'طلب‌ها',
    treasury: 'صندوقچه',
    wallet: 'کیف پول',
    'opening-balances': 'موجودی اول دوره',
    'net-available-settings': 'دارایی قابل اتکا',
    'loan-calculator': 'محاسبات درخواست وام',
    'currency-converter': 'تبدیل ارز',
    'date-calculator': 'محاسبه تاریخ',
    'report-financial-summary': 'خلاصه مالی',
    'report-income-expense': 'درآمد و هزینه',
    'report-cash-flow': 'جریان نقدی',
    'report-due-dates': 'سررسیدها',
    'report-assets-liabilities': 'دارایی و بدهی',
    'report-opening-balances': 'موجودی اول دوره',
    'report-wallet': 'گزارش کیف پول',
    'report-treasury': 'گزارش صندوقچه',
    'report-receivables': 'گزارش طلب‌ها',
    'report-dang': 'گزارش بدهی‌ها',
    'report-installments': 'گزارش اقساط',
    'report-checks': 'گزارش چک‌ها',
  };

  const [recordsFormType, setRecordsFormType] = useState<'income' | 'expense' | undefined>();
  const pageSpeedDialConfig = usePageSpeedDialConfig();
  useEngagementReminders();
  const showPageSpeedDial =
    !showSettings && SPEED_DIAL_TABS.includes(tab) && pageSpeedDialConfig != null;

  const handleTabChange = (newTab: Tab) => {
    setShowSettings(false);
    setMenuOpen(false);
    if (newTab !== 'records') setRecordsFormType(undefined);
    if (CALCULATION_TABS.includes(newTab)) {
      setCalcMenuExpanded(true);
    }
    if (REPORT_TABS.includes(newTab)) {
      setReportsMenuExpanded(true);
    }
    setTab(newTab);
  };

  const openRecords = (formType?: 'income' | 'expense') => {
    setShowSettings(false);
    setMenuOpen(false);
    setRecordsFormType(formType);
    setTab('records');
  };

  const openSettings = () => {
    setShowSettings(true);
    setMenuOpen(false);
  };

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  useEffect(() => {
    if (tab === 'installments') setInstallmentsMounted(true);
  }, [tab]);

  const showHeaderBack =
    !showSettings &&
    (tab === 'records' ||
      tab === 'entry' ||
      tab === 'opening-balances' ||
      tab === 'net-available-settings' ||
      CALCULATION_TABS.includes(tab) ||
      REPORT_TABS.includes(tab));

  const isCalculationTab = CALCULATION_TABS.includes(tab);
  const isReportTab = REPORT_TABS.includes(tab);

  return (
    <div className="app-layout">
      <header className={`app-header${showHeaderBack ? ' app-header--with-back' : ''}`}>
        <button
          type="button"
          className={`header-icon-btn header-icon-btn--menu${menuOpen ? ' active' : ''}`}
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? 'بستن منو' : 'باز کردن منو'}
          aria-expanded={menuOpen}
          title="منو"
        >
          <AppIcon name={menuOpen ? 'close' : 'menu'} size={20} strokeWidth={2} />
        </button>
        <h1 className="app-header-title">{showSettings ? 'تنظیمات' : titles[tab]}</h1>
        {showHeaderBack ? (
          <button
            type="button"
            className="header-icon-btn header-back-btn"
            onClick={() =>
              handleTabChange(tab === 'opening-balances' ? 'wallet' : 'dashboard')
            }
            aria-label={
              tab === 'opening-balances' ? 'بازگشت به کیف پول' : 'بازگشت به داشبورد'
            }
            title="بازگشت"
          >
            <AppIcon name="back" size={20} strokeWidth={2} />
          </button>
        ) : (
          <span className="header-icon-spacer" aria-hidden="true" />
        )}
      </header>

      {menuOpen && (
        <>
          <button
            type="button"
            className="app-menu-backdrop"
            onClick={() => setMenuOpen(false)}
            aria-label="بستن منو"
          />
          <nav className="app-menu-drawer" aria-label="منوی اصلی">
            <div className="app-menu-profile">
              {userPicture ? (
                <img src={userPicture} alt="" className="app-menu-avatar" />
              ) : (
                <div className="app-menu-avatar app-menu-avatar--placeholder" aria-hidden>
                  <AppIcon name="dashboard" size={28} strokeWidth={1.5} />
                </div>
              )}
              <div className="app-menu-profile-text">
                {userName && <div className="app-menu-name">{userName}</div>}
                <div className="app-menu-greeting">سلام، خوش آمدید</div>
              </div>
            </div>
            <div className="app-menu-items">
              <div className="app-menu-group">
                <button
                  type="button"
                  className={`app-menu-item app-menu-item--parent${
                    isReportTab ? ' active' : ''
                  }`}
                  onClick={() => setReportsMenuExpanded((v) => !v)}
                  aria-expanded={reportsMenuExpanded}
                >
                  <span className="app-menu-item-icon">
                    <AppIcon name="chart" size={20} strokeWidth={1.75} />
                  </span>
                  <span className="app-menu-item-label">گزارشات</span>
                  <span
                    className={`app-menu-chevron${reportsMenuExpanded ? ' expanded' : ''}`}
                    aria-hidden="true"
                  >
                    <AppIcon name="chevron-down" size={16} strokeWidth={2} />
                  </span>
                </button>
                {reportsMenuExpanded && (
                  <div className="app-menu-submenu">
                    <div className="app-menu-submenu-label">خلاصه</div>
                    <button
                      type="button"
                      className={`app-menu-item app-menu-item--sub${
                        tab === 'report-financial-summary' ? ' active' : ''
                      }`}
                      onClick={() => handleTabChange('report-financial-summary')}
                    >
                      خلاصه مالی
                    </button>
                    <button
                      type="button"
                      className={`app-menu-item app-menu-item--sub${
                        tab === 'report-income-expense' ? ' active' : ''
                      }`}
                      onClick={() => handleTabChange('report-income-expense')}
                    >
                      درآمد و هزینه
                    </button>
                    <button
                      type="button"
                      className={`app-menu-item app-menu-item--sub${
                        tab === 'report-cash-flow' ? ' active' : ''
                      }`}
                      onClick={() => handleTabChange('report-cash-flow')}
                    >
                      جریان نقدی
                    </button>
                    <div className="app-menu-submenu-label">ترکیبی</div>
                    <button
                      type="button"
                      className={`app-menu-item app-menu-item--sub${
                        tab === 'report-due-dates' ? ' active' : ''
                      }`}
                      onClick={() => handleTabChange('report-due-dates')}
                    >
                      سررسیدها
                    </button>
                    <button
                      type="button"
                      className={`app-menu-item app-menu-item--sub${
                        tab === 'report-assets-liabilities' ? ' active' : ''
                      }`}
                      onClick={() => handleTabChange('report-assets-liabilities')}
                    >
                      دارایی و بدهی
                    </button>
                    <button
                      type="button"
                      className={`app-menu-item app-menu-item--sub${
                        tab === 'report-opening-balances' ? ' active' : ''
                      }`}
                      onClick={() => handleTabChange('report-opening-balances')}
                    >
                      موجودی اول دوره
                    </button>
                    <div className="app-menu-submenu-label">تفصیلی</div>
                    <button
                      type="button"
                      className={`app-menu-item app-menu-item--sub${
                        tab === 'report-wallet' ? ' active' : ''
                      }`}
                      onClick={() => handleTabChange('report-wallet')}
                    >
                      کیف پول
                    </button>
                    <button
                      type="button"
                      className={`app-menu-item app-menu-item--sub${
                        tab === 'report-treasury' ? ' active' : ''
                      }`}
                      onClick={() => handleTabChange('report-treasury')}
                    >
                      صندوقچه
                    </button>
                    <button
                      type="button"
                      className={`app-menu-item app-menu-item--sub${
                        tab === 'report-receivables' ? ' active' : ''
                      }`}
                      onClick={() => handleTabChange('report-receivables')}
                    >
                      طلب‌ها
                    </button>
                    <button
                      type="button"
                      className={`app-menu-item app-menu-item--sub${
                        tab === 'report-dang' ? ' active' : ''
                      }`}
                      onClick={() => handleTabChange('report-dang')}
                    >
                      بدهی‌ها
                    </button>
                    <button
                      type="button"
                      className={`app-menu-item app-menu-item--sub${
                        tab === 'report-installments' ? ' active' : ''
                      }`}
                      onClick={() => handleTabChange('report-installments')}
                    >
                      اقساط
                    </button>
                    <button
                      type="button"
                      className={`app-menu-item app-menu-item--sub${
                        tab === 'report-checks' ? ' active' : ''
                      }`}
                      onClick={() => handleTabChange('report-checks')}
                    >
                      چک‌ها
                    </button>
                  </div>
                )}
              </div>
              <div className="app-menu-group">
                <button
                  type="button"
                  className={`app-menu-item app-menu-item--parent${
                    isCalculationTab ? ' active' : ''
                  }`}
                  onClick={() => setCalcMenuExpanded((v) => !v)}
                  aria-expanded={calcMenuExpanded}
                >
                  <span className="app-menu-item-icon">
                    <AppIcon name="calculator" size={20} strokeWidth={1.75} />
                  </span>
                  <span className="app-menu-item-label">محاسبات</span>
                  <span
                    className={`app-menu-chevron${calcMenuExpanded ? ' expanded' : ''}`}
                    aria-hidden="true"
                  >
                    <AppIcon name="chevron-down" size={16} strokeWidth={2} />
                  </span>
                </button>
                {calcMenuExpanded && (
                  <div className="app-menu-submenu">
                    <button
                      type="button"
                      className={`app-menu-item app-menu-item--sub${
                        tab === 'loan-calculator' ? ' active' : ''
                      }`}
                      onClick={() => handleTabChange('loan-calculator')}
                    >
                      محاسبات درخواست وام
                    </button>
                    <button
                      type="button"
                      className={`app-menu-item app-menu-item--sub${
                        tab === 'currency-converter' ? ' active' : ''
                      }`}
                      onClick={() => handleTabChange('currency-converter')}
                    >
                      تبدیل ارز
                    </button>
                    <button
                      type="button"
                      className={`app-menu-item app-menu-item--sub${
                        tab === 'date-calculator' ? ' active' : ''
                      }`}
                      onClick={() => handleTabChange('date-calculator')}
                    >
                      محاسبه تاریخ
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                className={`app-menu-item${showSettings ? ' active' : ''}`}
                onClick={openSettings}
              >
                <span className="app-menu-item-icon">
                  <AppIcon name="settings" size={20} strokeWidth={1.75} />
                </span>
                تنظیمات
              </button>
            </div>
          </nav>
        </>
      )}

      <main className="app-main">
        <div key={showSettings ? 'settings' : String(dataKey)} className="page-content">
          {showSettings ? (
            <SettingsPage
              onLogout={onLogout}
              onSpreadsheetChange={() => setDataKey((key) => key + 1)}
            />
          ) : (
            <>
              {installmentsMounted ? (
                <div hidden={tab !== 'installments'} aria-hidden={tab !== 'installments'}>
                  <Suspense
                    fallback={
                      tab === 'installments' ? <InstallmentCardListSkeleton /> : null
                    }
                  >
                    <InstallmentsPage
                      onReauth={onReauth}
                      active={tab === 'installments'}
                    />
                  </Suspense>
                </div>
              ) : null}
              {tab === 'dashboard' && (
                <DashboardPage
                  onReauth={onReauth}
                  onViewRecords={openRecords}
                  onNavigate={handleTabChange}
                  onConfigureNetAvailable={() => handleTabChange('net-available-settings')}
                />
              )}
              {tab === 'entry' && (
                <DataEntryPage
                  onReauth={onReauth}
                  onCancel={() => handleTabChange('dashboard')}
                />
              )}
              {tab === 'records' && (
                <RecordsPage onReauth={onReauth} initialFormType={recordsFormType} />
              )}
              {tab === 'dang' && <DangPage onReauth={onReauth} />}
              {tab === 'checks' && <ChecksPage onReauth={onReauth} />}
              {tab === 'receivables' && <ReceivablesPage onReauth={onReauth} />}
              {tab === 'treasury' && <TreasuryPage onReauth={onReauth} />}
              {tab === 'wallet' && (
                <WalletPage
                  onReauth={onReauth}
                  onOpenOpeningBalances={() => handleTabChange('opening-balances')}
                />
              )}
              {tab === 'opening-balances' && <OpeningBalancePage onReauth={onReauth} />}
              {tab === 'net-available-settings' && (
                <NetAvailableSettingsPage onReauth={onReauth} />
              )}
              {tab === 'loan-calculator' && <LoanRequestCalculatorPage />}
              {tab === 'currency-converter' && <CurrencyConverterPage />}
              {tab === 'date-calculator' && <DateCalculatorPage />}
              {tab === 'report-financial-summary' && (
                <FinancialSummaryReportPage onReauth={onReauth} />
              )}
              {tab === 'report-income-expense' && (
                <IncomeExpenseReportPage onReauth={onReauth} />
              )}
              {tab === 'report-cash-flow' && <CashFlowReportPage onReauth={onReauth} />}
              {tab === 'report-due-dates' && <DueDatesReportPage onReauth={onReauth} />}
              {tab === 'report-assets-liabilities' && (
                <AssetsLiabilitiesReportPage onReauth={onReauth} />
              )}
              {tab === 'report-opening-balances' && (
                <OpeningBalanceReportPage onReauth={onReauth} />
              )}
              {tab === 'report-wallet' && (
                <ModuleReportPage kind="wallet" onReauth={onReauth} />
              )}
              {tab === 'report-treasury' && (
                <ModuleReportPage kind="treasury" onReauth={onReauth} />
              )}
              {tab === 'report-receivables' && (
                <ModuleReportPage kind="receivables" onReauth={onReauth} />
              )}
              {tab === 'report-dang' && <ModuleReportPage kind="dang" onReauth={onReauth} />}
              {tab === 'report-installments' && (
                <ModuleReportPage kind="installments" onReauth={onReauth} />
              )}
              {tab === 'report-checks' && (
                <ModuleReportPage kind="checks" onReauth={onReauth} />
              )}
            </>
          )}
        </div>
      </main>

      <nav className="bottom-nav">
        <div className="bottom-nav-side bottom-nav-side--right">
          <button
            className={!showSettings && tab === 'installments' ? 'active' : ''}
            onClick={() => handleTabChange('installments')}
          >
            <span className="icon">
              <AppIcon name="installments" />
            </span>
            اقساط
          </button>
          <button
            className={!showSettings && tab === 'dang' ? 'active' : ''}
            onClick={() => handleTabChange('dang')}
          >
            <span className="icon">
              <AppIcon name="debt" />
            </span>
            بدهی
          </button>
          <button
            className={!showSettings && tab === 'checks' ? 'active' : ''}
            onClick={() => handleTabChange('checks')}
          >
            <span className="icon">
              <AppIcon name="checks" />
            </span>
            چک‌ها
          </button>
        </div>

        <div className="bottom-nav-center">
          <button
            type="button"
            className={`bottom-nav-dashboard${
              !showSettings && (tab === 'dashboard' || tab === 'records') ? ' active' : ''
            }`}
            onClick={() => handleTabChange('dashboard')}
            aria-label="داشبورد"
          >
            <span className="bottom-nav-dashboard-icon">
              <AppIcon name="dashboard" size={26} />
            </span>
            <span className="bottom-nav-dashboard-label">داشبورد</span>
          </button>
        </div>

        <div className="bottom-nav-side bottom-nav-side--left">
          <button
            className={!showSettings && tab === 'receivables' ? 'active' : ''}
            onClick={() => handleTabChange('receivables')}
          >
            <span className="icon">
              <AppIcon name="receivables" />
            </span>
            طلب‌ها
          </button>
          <button
            className={!showSettings && tab === 'treasury' ? 'active' : ''}
            onClick={() => handleTabChange('treasury')}
          >
            <span className="icon">
              <AppIcon name="treasury" />
            </span>
            صندوق
          </button>
          <button
            className={!showSettings && tab === 'wallet' ? 'active' : ''}
            onClick={() => handleTabChange('wallet')}
          >
            <span className="icon">
              <AppIcon name="wallet" />
            </span>
            کیف پول
          </button>
        </div>
      </nav>

      {!showSettings && tab === 'dashboard' && (
        <div className="fab-container">
          <button
            type="button"
            className="fab"
            onClick={() => handleTabChange('entry')}
            aria-label="ثبت درآمد یا هزینه"
            title="ثبت جدید"
          >
            <AppIcon name="add" size={24} strokeWidth={2} />
          </button>
        </div>
      )}

      {showPageSpeedDial && (
        <PageSpeedDial
          actions={pageSpeedDialConfig.actions}
          ariaLabel={pageSpeedDialConfig.ariaLabel}
        />
      )}
    </div>
  );
}
