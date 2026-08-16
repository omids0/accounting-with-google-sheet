import { useState, useEffect } from 'react';
import { registerSW } from 'virtual:pwa-register';
import LoginPage from './components/LoginPage';
import Layout from './components/Layout';
import { isTokenValid } from './services/auth';
import { isConfigured } from './services/settings';
import { prepareUserSpreadsheet } from './services/spreadsheetSetup';

function ConfigNotice() {
  return (
    <div className="login-page">
      <div className="login-card animate-in">
        <div className="login-logo">
          <span className="icon">⚠️</span>
          <h1>تنظیمات Google OAuth</h1>
          <p>
            <code dir="ltr">VITE_GOOGLE_CLIENT_ID</code> در فایل{' '}
            <code dir="ltr">.env</code> تنظیم نشده.
          </p>
        </div>
        <div className="alert alert-info" dir="ltr" style={{ textAlign: 'left', fontSize: '0.75rem' }}>
          VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [ready, setReady] = useState(false);
  const [sheetError, setSheetError] = useState('');

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
  const isOAuthConfigured = !!clientId && !clientId.startsWith('xxx');

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const configured = isConfigured();
      const tokenValid = isTokenValid();

      if (configured && tokenValid) {
        try {
          await prepareUserSpreadsheet();
          if (!cancelled) {
            setLoggedIn(true);
            setNeedsReauth(false);
            setSheetError('');
          }
        } catch (err) {
          if (!cancelled) {
            setLoggedIn(false);
            setNeedsReauth(true);
            setSheetError(
              err instanceof Error ? err.message : 'خطا در اتصال به گوگل شیت'
            );
          }
        }
      } else {
        setLoggedIn(false);
        setNeedsReauth(configured && !tokenValid);
      }

      if (!cancelled) setReady(true);
    }

    init();

    registerSW({
      onNeedRefresh() {
        if (confirm('نسخه جدید موجود است. بروزرسانی شود؟')) {
          window.location.reload();
        }
      },
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!isOAuthConfigured) return <ConfigNotice />;
  if (!ready) {
    return (
      <div className="app-loading">
        <div className="app-loading-inner">
          <span className="app-loading-icon">📊</span>
          <div className="spinner spinner-lg" />
        </div>
      </div>
    );
  }

  if (!loggedIn || needsReauth) {
    return (
      <LoginPage
        initialError={sheetError}
        onSuccess={() => {
          setLoggedIn(true);
          setNeedsReauth(false);
          setSheetError('');
        }}
      />
    );
  }

  return (
    <Layout
      onLogout={() => {
        setLoggedIn(false);
        setNeedsReauth(false);
      }}
      onReauth={() => setNeedsReauth(true)}
    />
  );
}
