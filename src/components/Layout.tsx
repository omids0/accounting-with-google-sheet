import { useState } from 'react';
import DashboardPage from './DashboardPage';
import DataEntryPage from './DataEntryPage';
import RecordsPage from './RecordsPage';
import InstallmentsPage from './InstallmentsPage';
import ReceivablesPage from './ReceivablesPage';
import TreasuryPage from './TreasuryPage';
import SettingsPage from './SettingsPage';
import { getUserName, getUserPicture } from '../services/auth';

type Tab = 'dashboard' | 'entry' | 'records' | 'installments' | 'receivables' | 'treasury' | 'settings';

interface LayoutProps {
  onLogout: () => void;
  onReauth: () => void;
}

export default function Layout({ onLogout, onReauth }: LayoutProps) {
  const [tab, setTab] = useState<Tab>('dashboard');
  const userName = getUserName();
  const userPicture = getUserPicture();

  const titles: Record<Tab, string> = {
    dashboard: 'داشبورد',
    entry: 'ثبت جدید',
    records: 'رکوردها',
    installments: 'اقساط',
    receivables: 'طلب‌ها',
    treasury: 'صندوقچه',
    settings: 'تنظیمات',
  };

  return (
    <div className="app-layout">
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {userPicture && (
            <img
              src={userPicture}
              alt=""
              style={{ width: 32, height: 32, borderRadius: '50%' }}
            />
          )}
          <div>
            <h1>{titles[tab]}</h1>
            <div className="subtitle">سلام، {userName}</div>
          </div>
        </div>
      </header>

      <main className="app-main">
        {tab === 'dashboard' && <DashboardPage onReauth={onReauth} />}
        {tab === 'entry' && <DataEntryPage onReauth={onReauth} />}
        {tab === 'records' && <RecordsPage onReauth={onReauth} />}
        {tab === 'installments' && <InstallmentsPage onReauth={onReauth} />}
        {tab === 'receivables' && <ReceivablesPage onReauth={onReauth} />}
        {tab === 'treasury' && <TreasuryPage onReauth={onReauth} />}
        {tab === 'settings' && <SettingsPage onLogout={onLogout} />}
      </main>

      <nav className="bottom-nav">
        <button
          className={tab === 'dashboard' ? 'active' : ''}
          onClick={() => setTab('dashboard')}
        >
          <span className="icon">📊</span>
          داشبورد
        </button>
        <button
          className={tab === 'entry' ? 'active' : ''}
          onClick={() => setTab('entry')}
        >
          <span className="icon">✏️</span>
          ثبت
        </button>
        <button
          className={tab === 'records' ? 'active' : ''}
          onClick={() => setTab('records')}
        >
          <span className="icon">📋</span>
          رکوردها
        </button>
        <button
          className={tab === 'installments' ? 'active' : ''}
          onClick={() => setTab('installments')}
        >
          <span className="icon">📅</span>
          اقساط
        </button>
        <button
          className={tab === 'receivables' ? 'active' : ''}
          onClick={() => setTab('receivables')}
        >
          <span className="icon">💰</span>
          طلب‌ها
        </button>
        <button
          className={tab === 'treasury' ? 'active' : ''}
          onClick={() => setTab('treasury')}
        >
          <span className="icon">🏦</span>
          صندوق
        </button>
        <button
          className={tab === 'settings' ? 'active' : ''}
          onClick={() => setTab('settings')}
        >
          <span className="icon">⚙️</span>
          تنظیمات
        </button>
      </nav>
    </div>
  );
}
