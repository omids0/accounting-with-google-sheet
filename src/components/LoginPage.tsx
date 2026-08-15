import { useState } from 'react';
import { signInWithGoogle } from '../services/auth';

interface LoginPageProps {
  onSuccess: () => void;
  reauth?: boolean;
}

export default function LoginPage({ onSuccess, reauth }: LoginPageProps) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      onSuccess();
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      const msg = err instanceof Error ? err.message : 'خطا در ورود';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setError('ورود لغو شد');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <span className="icon">📒</span>
          <h1>حسابداری شخصی</h1>
          {reauth && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
              لطفاً دوباره وارد شوید
            </p>
          )}
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <button
          className="btn btn-primary google-signin-btn"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <span className="spinner" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.223 36 24 36c-5.522 0-10-4.478-10-10s4.478-10 10-10c2.837 0 5.402 1.191 7.207 3.093l5.657-5.657C33.64 10.053 29.082 8 24 8 12.955 8 4 16.955 4 28s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
              <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 16.108 18.961 13 24 13c2.837 0 5.402 1.191 7.207 3.093l5.657-5.657C33.64 10.053 29.082 8 24 8 16.318 8 9.656 13.337 6.306 14.691z" />
              <path fill="#4CAF50" d="M24 48c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 39.091 26.715 40 24 40c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 43.556 16.227 48 24 48z" />
              <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C42.022 35.026 44 30.638 44 28c0-1.341-.138-2.65-.389-3.917z" />
            </svg>
          )}
          ورود با Google
        </button>
      </div>
    </div>
  );
}
