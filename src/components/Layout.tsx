import { useEffect, useState } from 'react';
import DashboardPage from './DashboardPage';
import DataEntryPage from './DataEntryPage';
import RecordsPage from './RecordsPage';
import InstallmentsPage from './InstallmentsPage';
import DangPage from './DangPage';
import ChecksPage from './ChecksPage';
import ReceivablesPage from './ReceivablesPage';
import TreasuryPage from './TreasuryPage';
import WalletPage from './WalletPage';
import OpeningBalancePage from './OpeningBalancePage';
import NetAvailableSettingsPage from './NetAvailableSettingsPage';
import SettingsPage from './SettingsPage';
import PageSpeedDial from './PageSpeedDial';
import AppIcon from './AppIcon';
import { getUserName, getUserPicture } from '../services/auth';
import { usePageSpeedDialConfig } from '../hooks/usePageSpeedDial';
import { useEngagementReminders } from '../hooks/useEngagementReminders';

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
  | 'net-available-settings';

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
  const [dataKey, setDataKey] = useState(0);
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

  const showHeaderBack =
    !showSettings &&
    (tab === 'records' ||
      tab === 'entry' ||
      tab === 'opening-balances' ||
      tab === 'net-available-settings');

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
        <div key={showSettings ? 'settings' : `${tab}-${dataKey}`} className="page-content">
          {showSettings ? (
            <SettingsPage
              onLogout={onLogout}
              onSpreadsheetChange={() => setDataKey((key) => key + 1)}
            />
          ) : (
            <>
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
              {tab === 'installments' && <InstallmentsPage onReauth={onReauth} />}
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
