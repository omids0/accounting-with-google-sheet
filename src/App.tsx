import { useState, useEffect } from 'react';
import { registerSW } from 'virtual:pwa-register';
import LoginPage from './components/LoginPage';
import Layout from './components/Layout';
import { subscribeToAuth } from './services/auth';
import { isFirebaseConfigured } from './services/firebase';

function DevConfigNotice() {
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <span className="icon">⚠️</span>
          <h1>تنظیمات Firebase</h1>
          <p>
            کانفیگ Firebase در <code dir="ltr">.env</code> تنظیم نشده.
            از Firebase Console مقادیر Web App را کپی کنید.
          </p>
        </div>
        <div className="alert alert-info" dir="ltr" style={{ textAlign: 'left', fontSize: '0.75rem' }}>
          VITE_FIREBASE_API_KEY=...<br />
          VITE_FIREBASE_AUTH_DOMAIN=...<br />
          VITE_FIREBASE_PROJECT_ID=...<br />
          VITE_FIREBASE_APP_ID=...
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [inApp, setInApp] = useState(false);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setReady(true);
      return;
    }

    const unsubscribe = subscribeToAuth((user, reauth) => {
      setInApp(!!user);
      setNeedsReauth(reauth);
      setReady(true);
    });

    registerSW({
      onNeedRefresh() {
        if (confirm('نسخه جدید موجود است. بروزرسانی شود؟')) {
          window.location.reload();
        }
      },
    });

    return unsubscribe;
  }, []);

  if (!isFirebaseConfigured()) {
    return <DevConfigNotice />;
  }

  if (!ready) return null;

  if (!inApp || needsReauth) {
    return (
      <LoginPage
        reauth={needsReauth}
        onSuccess={() => {
          setInApp(true);
          setNeedsReauth(false);
        }}
      />
    );
  }

  return (
    <Layout
      onLogout={() => {
        setInApp(false);
        setNeedsReauth(false);
      }}
      onTokenExpired={() => setNeedsReauth(true)}
    />
  );
}
