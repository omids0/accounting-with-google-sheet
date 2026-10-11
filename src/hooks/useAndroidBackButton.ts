import { App } from '@capacitor/app'
import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { closeTopOverlay, decideBackAction, getOverlayCount } from './overlayStack'
import { isNativePlatform } from '../services/googleAuthNative'
import { showInfo } from '../utils/toast'

/**
 * Hardware back on Android: close the top overlay, else go back a page, else ask
 * for a second press before leaving. Registering any listener turns off
 * Capacitor's default handling, so every branch must act.
 */
export function useAndroidBackButton() {
  const navigate = useNavigate()
  const location = useLocation()
  const pathnameRef = useRef(location.pathname)
  const lastRootPressRef = useRef<number | null>(null)

  pathnameRef.current = location.pathname

  useEffect(() => {
    if (!isNativePlatform()) return

    const listener = App.addListener('backButton', ({ canGoBack }) => {
      const now = Date.now()
      const action = decideBackAction({
        overlayOpen: getOverlayCount() > 0,
        pathname: pathnameRef.current,
        canGoBack,
        lastRootPressAt: lastRootPressRef.current,
        now
      })

      if (action === 'overlay') closeTopOverlay()
      else if (action === 'back') navigate(-1)
      else if (action === 'home') navigate('/', { replace: true })
      else if (action === 'exit') void App.exitApp()
      else {
        lastRootPressRef.current = now
        showInfo('برای خروج دوباره بزنید')
      }
    })

    return () => {
      void listener.then(handle => handle.remove())
    }
  }, [navigate])
}
