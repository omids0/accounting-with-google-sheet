import { useCallback, useEffect, useState } from 'react'

import { APP_LOCK_CHANGED_EVENT, isAppLockEnabled } from '../services/appLock'
import {
  APP_LOCK_REQUEST_EVENT,
  clearBackgroundPending,
  clearSessionUnlocked,
  getLockPolicy,
  markBackgroundPending,
  markSessionUnlocked,
  shouldLockOnForeground,
  shouldLockOnMount,
  touchActivity
} from '../services/appLockPolicy'

export function useAppLock() {
  const [lockEnabled, setLockEnabled] = useState(isAppLockEnabled)
  const [locked, setLocked] = useState(shouldLockOnMount)

  useEffect(() => {
    const onLockChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ enabled: boolean }>).detail

      setLockEnabled(detail.enabled)
      if (!detail.enabled) {
        clearBackgroundPending()
        clearSessionUnlocked()
        setLocked(false)
      } else {
        setLocked(shouldLockOnMount())
      }
    }

    const lockIfNeeded = () => {
      if (!shouldLockOnForeground()) return

      clearBackgroundPending()
      clearSessionUnlocked()
      setLocked(true)
    }

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        markBackgroundPending()
      } else if (document.visibilityState === 'visible') {
        lockIfNeeded()
      }
    }

    const onPageHide = () => {
      markBackgroundPending()
    }

    const onPageShow = () => {
      lockIfNeeded()
    }

    const onFreeze = () => {
      markBackgroundPending()
    }

    const onResume = () => {
      lockIfNeeded()
    }

    const onLockRequested = () => {
      if (!isAppLockEnabled()) return

      clearBackgroundPending()
      clearSessionUnlocked()
      setLocked(true)
    }

    const onActivity = () => {
      if (!lockEnabled || getLockPolicy() !== 'idle') return

      touchActivity()
    }

    const idleInterval =
      lockEnabled && getLockPolicy() === 'idle'
        ? window.setInterval(() => {
            if (shouldLockOnForeground()) {
              clearBackgroundPending()
              clearSessionUnlocked()
              setLocked(true)
            }
          }, 30_000)
        : undefined

    window.addEventListener(APP_LOCK_CHANGED_EVENT, onLockChanged)
    window.addEventListener(APP_LOCK_REQUEST_EVENT, onLockRequested)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('pageshow', onPageShow)
    document.addEventListener('freeze', onFreeze)
    document.addEventListener('resume', onResume)
    window.addEventListener('pointerdown', onActivity)
    window.addEventListener('keydown', onActivity)

    return () => {
      window.removeEventListener(APP_LOCK_CHANGED_EVENT, onLockChanged)
      window.removeEventListener(APP_LOCK_REQUEST_EVENT, onLockRequested)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('pageshow', onPageShow)
      document.removeEventListener('freeze', onFreeze)
      document.removeEventListener('resume', onResume)
      window.removeEventListener('pointerdown', onActivity)
      window.removeEventListener('keydown', onActivity)

      if (idleInterval) window.clearInterval(idleInterval)
    }
  }, [lockEnabled])

  const unlock = useCallback(() => {
    markSessionUnlocked()
    setLocked(false)
  }, [])

  const lock = useCallback(() => {
    if (!isAppLockEnabled()) return

    clearBackgroundPending()
    clearSessionUnlocked()
    setLocked(true)
  }, [])

  return {
    lockEnabled,
    locked: lockEnabled && locked,
    unlock,
    lock
  }
}
