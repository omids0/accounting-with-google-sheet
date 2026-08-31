import { useEffect, useRef } from 'react';
import { useGoogleOAuth } from '@react-oauth/google';
import { getMsUntilTokenRefresh, hasStoredSession, shouldRefreshToken } from '../services/auth';
import { refreshAccessTokenSilently } from '../services/tokenRefresh';

interface UseTokenRefreshOptions {
  clientId: string;
  enabled: boolean;
  onRefreshFailed?: () => void;
  onRefreshSuccess?: () => void;
}

export function useTokenRefresh({
  clientId,
  enabled,
  onRefreshFailed,
  onRefreshSuccess,
}: UseTokenRefreshOptions): void {
  const { scriptLoadedSuccessfully } = useGoogleOAuth();
  const onRefreshFailedRef = useRef(onRefreshFailed);
  onRefreshFailedRef.current = onRefreshFailed;
  const onRefreshSuccessRef = useRef(onRefreshSuccess);
  onRefreshSuccessRef.current = onRefreshSuccess;

  useEffect(() => {
    if (!enabled || !scriptLoadedSuccessfully || !clientId || !hasStoredSession()) {
      return;
    }

    let cancelled = false;
    let timeoutId: number | undefined;

    const runRefresh = async () => {
      if (cancelled) return;

      if (!shouldRefreshToken()) {
        scheduleNextRefresh();
        return;
      }

      const ok = await refreshAccessTokenSilently(clientId);
      if (cancelled) return;

      if (ok) {
        onRefreshSuccessRef.current?.();
        scheduleNextRefresh();
        return;
      }

      onRefreshFailedRef.current?.();
    };

    const scheduleNextRefresh = () => {
      if (cancelled) return;
      const delay = getMsUntilTokenRefresh();
      if (delay === null) return;

      timeoutId = window.setTimeout(runRefresh, delay);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible' || cancelled) return;
      if (!shouldRefreshToken()) return;
      void runRefresh();
    };

    scheduleNextRefresh();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [clientId, enabled, scriptLoadedSuccessfully]);
}
