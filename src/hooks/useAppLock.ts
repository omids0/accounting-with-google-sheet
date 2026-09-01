import { useCallback, useEffect, useState } from 'react';
import { APP_LOCK_CHANGED_EVENT, isAppLockEnabled } from '../services/appLock';

const PENDING_KEY = 'accounting_app_lock_pending';

export function useAppLock() {
  const [lockEnabled, setLockEnabled] = useState(isAppLockEnabled);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    const onLockChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ enabled: boolean }>).detail;
      setLockEnabled(detail.enabled);
      if (!detail.enabled) {
        sessionStorage.removeItem(PENDING_KEY);
        setLocked(false);
      }
    };

    const onVisibility = () => {
      if (!isAppLockEnabled()) return;

      if (document.visibilityState === 'hidden') {
        sessionStorage.setItem(PENDING_KEY, '1');
      } else if (
        document.visibilityState === 'visible' &&
        sessionStorage.getItem(PENDING_KEY)
      ) {
        sessionStorage.removeItem(PENDING_KEY);
        setLocked(true);
      }
    };

    window.addEventListener(APP_LOCK_CHANGED_EVENT, onLockChanged);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener(APP_LOCK_CHANGED_EVENT, onLockChanged);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const unlock = useCallback(() => {
    sessionStorage.removeItem(PENDING_KEY);
    setLocked(false);
  }, []);

  const lock = useCallback(() => {
    if (!isAppLockEnabled()) return;
    setLocked(true);
  }, []);

  return {
    lockEnabled,
    locked: lockEnabled && locked,
    unlock,
    lock,
  };
}
