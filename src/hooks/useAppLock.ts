import { useCallback, useEffect, useState } from 'react'

import { APP_LOCK_CHANGED_EVENT, isAppLockEnabled } from '../services/appLock'

const PENDING_KEY = 'accounting_app_lock_pending'

function markBackgroundPending(): void {
  if (!isAppLockEnabled()) return
  try {
    sessionStorage.setItem(PENDING_KEY, '1')
  } catch {
    // Ignore storage failures in private mode.
  }
}

function shouldLockOnForeground(): boolean {
  if (!isAppLockEnabled()) return false
  try {
    return sessionStorage.getItem(PENDING_KEY) === '1'
  } catch {
    return false
  }
}

function clearPending(): void {
  try {
    sessionStorage.removeItem(PENDING_KEY)
  } catch {
    // Ignore storage failures in private mode.
  }
}

export function useAppLock() {
  const [lockEnabled, setLockEnabled] = useState(isAppLockEnabled)

  const [locked, setLocked] = useState(() => isAppLockEnabled())

  useEffect(() => {
    const onLockChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ enabled: boolean }>).detail

      setLockEnabled(detail.enabled)
      if (!detail.enabled) {
        clearPending()
        setLocked(false)
      }
    }

    const lockIfPending = () => {
      if (shouldLockOnForeground()) {
        clearPending()
        setLocked(true)
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        markBackgroundPending()
      } else if (document.visibilityState === 'visible') {
        lockIfPending()
      }
    }

    const onPageHide = () => {
      markBackgroundPending()
    }

    const onPageShow = () => {
      lockIfPending()
    }

    const onFreeze = () => {
      markBackgroundPending()
    }

    const onResume = () => {
      lockIfPending()
    }

    window.addEventListener(APP_LOCK_CHANGED_EVENT, onLockChanged)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('pageshow', onPageShow)
    document.addEventListener('freeze', onFreeze)
    document.addEventListener('resume', onResume)

    return () => {
      window.removeEventListener(APP_LOCK_CHANGED_EVENT, onLockChanged)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('pageshow', onPageShow)
      document.removeEventListener('freeze', onFreeze)
      document.removeEventListener('resume', onResume)
    }
  }, [])

  const unlock = useCallback(() => {
    clearPending()
    setLocked(false)
  }, [])

  const lock = useCallback(() => {
    if (!isAppLockEnabled()) return
    setLocked(true)
  }, [])

  return {
    lockEnabled,
    locked: lockEnabled && locked,
    unlock,
    lock
  }
}
