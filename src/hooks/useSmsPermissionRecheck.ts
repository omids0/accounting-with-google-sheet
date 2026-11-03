import { App } from '@capacitor/app'
import { useEffect, useRef } from 'react'

import { getBankSmsPermission } from '../services/bankSmsNative'

/**
 * While `active`, re-reads the SMS permission each time the app comes back to the foreground
 * (the user was in system settings) and calls `onGranted` once it is granted.
 */
export function useSmsPermissionRecheck(active: boolean, onGranted: () => void): void {
  const onGrantedRef = useRef(onGranted)

  useEffect(() => {
    onGrantedRef.current = onGranted
  })

  useEffect(() => {
    if (!active) return

    let done = false
    const check = () => {
      void getBankSmsPermission()
        .then(state => {
          if (state !== 'granted' || done) return

          done = true
          onGrantedRef.current()
        })
        .catch(() => {})
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') check()
    }

    document.addEventListener('visibilitychange', onVisible)

    const resume = App.addListener('resume', check)

    return () => {
      done = true
      document.removeEventListener('visibilitychange', onVisible)
      void resume.then(handle => handle.remove())
    }
  }, [active])
}
