import { useState } from 'react';
import { logout, getUserName, getUserPicture } from '../services/auth';
import DataEntryPage from './DataEntryPage';
import RecordsPage from './RecordsPage';
import SettingsPage from './SettingsPage';

type Tab = 'entry' | 'records' | 'settings';

interface LayoutProps {
  onLogout: () => void;
  onTokenExpired?: () => void;
}

export default function Layout({ onLogout, onTokenExpired }: LayoutProps) {
  const [tab, setTab] = useState<Tab>('entry');
  const userName = getUserName();
  const userPicture = getUserPicture();

  const handleLogout = async () => {
    if (confirm('از اپ خارج می‌شوید؟ دفعه بعد باید دوباره با گوگل وارد شوید.')) {
      await logout();
      onLogout();
    }
  };

  const titles: Record<Tab, string> = {
    entry: 'ثبت جدید',
    records: 'رکوردها',
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
        <button
          onClick={handleLogout}
          style={{ color: 'white', fontSize: '0.8rem', opacity: 0.9 }}
        >
          خروج
        </button>
      </header>

      <main className="app-main">
        {tab === 'entry' && <DataEntryPage onTokenExpired={onTokenExpired} />}
        {tab === 'records' && <RecordsPage onTokenExpired={onTokenExpired} />}
        {tab === 'settings' && <SettingsPage />}
      </main>

      <nav className="bottom-nav">
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
