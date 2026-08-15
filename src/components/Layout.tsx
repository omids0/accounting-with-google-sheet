import { useState } from 'react';
import DashboardPage from './DashboardPage';
import DataEntryPage from './DataEntryPage';
import RecordsPage from './RecordsPage';
import InstallmentsPage from './InstallmentsPage';
import ReceivablesPage from './ReceivablesPage';
import TreasuryPage from './TreasuryPage';
import WalletPage from './WalletPage';
import SettingsPage from './SettingsPage';
import { getUserName, getUserPicture } from '../services/auth';

type Tab =
  | 'dashboard'
  | 'entry'
  | 'records'
  | 'installments'
  | 'receivables'
  | 'treasury'
  | 'wallet';

interface LayoutProps {
  onLogout: () => void;
  onReauth: () => void;
}

export default function Layout({ onLogout, onReauth }: LayoutProps) {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [showSettings, setShowSettings] = useState(false);
  const userName = getUserName();
  const userPicture = getUserPicture();

  const titles: Record<Tab, string> = {
    dashboard: 'داشبورد',
    entry: 'ثبت جدید',
    records: 'رکوردها',
    installments: 'اقساط',
    receivables: 'طلب‌ها',
    treasury: 'صندوقچه',
    wallet: 'کیف پول',
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
          {!showSettings && tab === 'records' && (
            <button
              type="button"
              className="header-icon-btn"
              onClick={() => handleTabChange('dashboard')}
              aria-label="بازگشت به داشبورد"
              title="بازگشت"
            >
              →
            </button>
          )}
          {userPicture && tab !== 'records' && (
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
        <div key={showSettings ? 'settings' : tab} className="page-content">
          {showSettings ? (
            <SettingsPage onLogout={onLogout} />
          ) : (
            <>
              {tab === 'dashboard' && (
                <DashboardPage onReauth={onReauth} onViewRecords={openRecords} />
              )}
              {tab === 'entry' && <DataEntryPage onReauth={onReauth} />}
              {tab === 'records' && (
                <RecordsPage onReauth={onReauth} initialFormType={recordsFormType} />
              )}
              {tab === 'installments' && <InstallmentsPage onReauth={onReauth} />}
              {tab === 'receivables' && <ReceivablesPage onReauth={onReauth} />}
              {tab === 'treasury' && <TreasuryPage onReauth={onReauth} />}
              {tab === 'wallet' && <WalletPage onReauth={onReauth} />}
            </>
          )}
        </div>
      </main>

      <nav className="bottom-nav">
        <button
          className={
            !showSettings && (tab === 'dashboard' || tab === 'records') ? 'active' : ''
          }
          onClick={() => handleTabChange('dashboard')}
        >
          <span className="icon">📊</span>
          داشبورد
        </button>
        <button
          className={!showSettings && tab === 'entry' ? 'active' : ''}
          onClick={() => handleTabChange('entry')}
        >
          <span className="icon">✏️</span>
          ثبت
        </button>
        <button
          className={!showSettings && tab === 'installments' ? 'active' : ''}
          onClick={() => handleTabChange('installments')}
        >
          <span className="icon">📅</span>
          اقساط
        </button>
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
      </nav>
    </div>
  );
}
