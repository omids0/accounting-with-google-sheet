import { useState } from 'react';
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
import SettingsPage from './SettingsPage';
import { getUserName, getUserPicture } from '../services/auth';

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
  | 'opening-balances';

interface LayoutProps {
  onLogout: () => void;
  onReauth: () => void;
}

export default function Layout({ onLogout, onReauth }: LayoutProps) {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [showSettings, setShowSettings] = useState(false);
  const [dataKey, setDataKey] = useState(0);
  const userName = getUserName();
  const userPicture = getUserPicture();

  const titles: Record<Tab, string> = {
    dashboard: 'داشبورد',
    entry: 'ثبت جدید',
    records: 'رکوردها',
    installments: 'اقساط',
    dang: 'دنگ',
    checks: 'چک‌ها',
    receivables: 'طلب‌ها',
    treasury: 'صندوقچه',
    wallet: 'کیف پول',
    'opening-balances': 'موجودی اول دوره',
  };

  const [recordsFormType, setRecordsFormType] = useState<'income' | 'expense' | undefined>();

  const handleTabChange = (newTab: Tab) => {
    setShowSettings(false);
    if (newTab !== 'records') setRecordsFormType(undefined);
    setTab(newTab);
  };

  const openRecords = (formType?: 'income' | 'expense') => {
    setShowSettings(false);
    setRecordsFormType(formType);
    setTab('records');
  };

  return (
    <div className="app-layout">
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {!showSettings && (tab === 'records' || tab === 'entry' || tab === 'opening-balances') && (
            <button
              type="button"
              className="header-icon-btn"
              onClick={() =>
                handleTabChange(tab === 'opening-balances' ? 'wallet' : 'dashboard')
              }
              aria-label={tab === 'opening-balances' ? 'بازگشت به کیف پول' : 'بازگشت به داشبورد'}
              title="بازگشت"
            >
              →
            </button>
          )}
          {userPicture &&
            tab !== 'records' &&
            tab !== 'entry' &&
            tab !== 'opening-balances' && (
            <img
              src={userPicture}
              alt=""
              className="header-avatar"
            />
          )}
          <div>
            <h1>{showSettings ? 'تنظیمات' : titles[tab]}</h1>
            <div className="subtitle">سلام، {userName}</div>
          </div>
        </div>
        <button
          type="button"
          className={`header-icon-btn${showSettings ? ' active' : ''}`}
          onClick={() => setShowSettings((v) => !v)}
          aria-label="تنظیمات"
          title="تنظیمات"
        >
          ⚙️
        </button>
      </header>

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
                />
              )}
              {tab === 'entry' && <DataEntryPage onReauth={onReauth} />}
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
            <span className="icon">📅</span>
            اقساط
          </button>
          <button
            className={!showSettings && tab === 'dang' ? 'active' : ''}
            onClick={() => handleTabChange('dang')}
          >
            <span className="icon">🍽️</span>
            دنگ
          </button>
          <button
            className={!showSettings && tab === 'checks' ? 'active' : ''}
            onClick={() => handleTabChange('checks')}
          >
            <span className="icon">📝</span>
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
            <span className="bottom-nav-dashboard-icon">📊</span>
            <span className="bottom-nav-dashboard-label">داشبورد</span>
          </button>
        </div>

        <div className="bottom-nav-side bottom-nav-side--left">
          <button
            className={!showSettings && tab === 'receivables' ? 'active' : ''}
            onClick={() => handleTabChange('receivables')}
          >
            <span className="icon">💰</span>
            طلب‌ها
          </button>
          <button
            className={!showSettings && tab === 'treasury' ? 'active' : ''}
            onClick={() => handleTabChange('treasury')}
          >
            <span className="icon">🏦</span>
            صندوق
          </button>
          <button
            className={!showSettings && tab === 'wallet' ? 'active' : ''}
            onClick={() => handleTabChange('wallet')}
          >
            <span className="icon">👛</span>
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
            +
          </button>
        </div>
      )}
    </div>
  );
}
