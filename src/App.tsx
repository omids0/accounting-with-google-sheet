import { useState, useEffect } from 'react';
import { registerSW } from 'virtual:pwa-register';
import LoginPage from './components/LoginPage';
import Layout from './components/Layout';
import { isTokenValid } from './services/auth';
import { isConfigured } from './services/settings';

function ConfigNotice() {
  return (
    <div className="login-page">
      <div className="login-card">
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

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
  const isOAuthConfigured = !!clientId && !clientId.startsWith('xxx');

  useEffect(() => {
    setLoggedIn(isConfigured() && isTokenValid());
    setNeedsReauth(isConfigured() && !isTokenValid());
    setReady(true);

    registerSW({
      onNeedRefresh() {
        if (confirm('نسخه جدید موجود است. بروزرسانی شود؟')) {
          window.location.reload();
        }
      },
    });
  }, []);

  if (!isOAuthConfigured) return <ConfigNotice />;
  if (!ready) return null;

  if (!loggedIn || needsReauth) {
    return (
      <LoginPage
        onSuccess={() => {
          setLoggedIn(true);
          setNeedsReauth(false);
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
