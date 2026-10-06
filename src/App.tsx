import { useGoogleOAuth } from '@react-oauth/google'
import { useState, useEffect, useCallback, useRef } from 'react'
import { registerSW } from 'virtual:pwa-register'

import AppIcon from './components/AppIcon'
import AppLockPrompts from './components/appLock/AppLockPrompts'
import LoginPage from './components/LoginPage'
import { AppLoadingSkeleton } from './components/skeleton'
import SpreadsheetSetupPanel from './components/SpreadsheetSetupPanel'
import Alert from './components/ui/Alert'
import { animateInClass } from './components/ui/layoutStyles'
import {
  loginCardClass,
  loginLogoClass,
  loginLogoIconClass,
  loginLogoSubtitleClass,
  loginLogoTitleClass,
  loginPageClass
} from './components/ui/loginStyles'
import UnlockScreen from './components/UnlockScreen'
import { useAppLock } from './hooks/useAppLock'
import { useTokenRefresh } from './hooks/useTokenRefresh'
import { AppAuthenticatedRoutes } from './routes/AppRoutes'
import { isAppLockEnabled } from './services/appLock'
import { scrubPinHashFromSheetOnce } from './services/appLockSheetScrub'
import { hasStoredSession, isAuthError, isTokenValid } from './services/auth'
import { isNativePlatform } from './services/googleAuthNative'
import { isConfigured, getSettings } from './services/settings'
import { initializeSheetSync } from './services/sheetSync'
import {
  getDefaultFirstSheetLabel,
  prepareUserSpreadsheet,
  resolveSpreadsheetSession
} from './services/spreadsheetSetup'
import { hasStoreData, hydrateStore } from './services/spreadsheetStore'
import { refreshAccessTokenSilently } from './services/tokenRefresh'
import { useAppStore } from './stores/appStore'
import type { SpreadsheetEntry } from './types'
import { cn } from './utils/cn'

function ConfigNotice() {
  return (
    <div className={loginPageClass}>
      <div className={cn(loginCardClass, animateInClass)}>
        <div className={loginLogoClass}>
          <span className={loginLogoIconClass}>
            <AppIcon name="warning" />
          </span>
          <h1 className={loginLogoTitleClass}>تنظیمات Google OAuth</h1>
          <p className={loginLogoSubtitleClass}>
            <code dir="ltr">VITE_GOOGLE_CLIENT_ID</code> در فایل <code dir="ltr">.env</code> تنظیم
            نشده.
          </p>
        </div>
        <Alert variant="info" dir="ltr" style={{ textAlign: 'left', fontSize: '0.75rem' }}>
          VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
        </Alert>
      </div>
    </div>
  )
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false)

  const [needsReauth, setNeedsReauth] = useState(false)

  const [needsSheetSetup, setNeedsSheetSetup] = useState(false)

  const [sheetSetupMode, setSheetSetupMode] = useState<'pick' | 'create'>('pick')

  const [sheetOptions, setSheetOptions] = useState<SpreadsheetEntry[]>([])

  const [ready, setReady] = useState(false)

  const [sheetError, setSheetError] = useState('')

  // While start-up is still renewing the token, an early 401 from a page must
  // not flash the re-login screen; start-up decides that itself.
  const startupDoneRef = useRef(false)

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

  const isOAuthConfigured = !!clientId && !clientId.startsWith('xxx')

  const { scriptLoadedSuccessfully } = useGoogleOAuth()

  // The APK renews its token through the native plugin, so Google's web script
  // never loading there must not block a refresh.
  const canRefreshSilently = isNativePlatform() || scriptLoadedSuccessfully

  const { locked, unlock } = useAppLock()

  // With the app lock on, this device's data is encrypted: nothing is read from
  // it, synced or persisted until the first unlock of this page puts the key in
  // memory. Without a lock (or without a session to unlock) start-up is as before.
  const [dataUnlocked, setDataUnlocked] = useState(() => !isAppLockEnabled() || !hasStoredSession())

  const handleUnlock = useCallback(() => {
    unlock()
    setDataUnlocked(true)
  }, [unlock])

  const registerHandlers = useAppStore(state => state.registerHandlers)

  const handleLogout = useCallback(() => {
    setLoggedIn(false)
    setNeedsReauth(false)
    setNeedsSheetSetup(false)
  }, [])

  const handleReauth = useCallback(async () => {
    if (!startupDoneRef.current) return
    if (canRefreshSilently && hasStoredSession()) {
      const refreshed = await refreshAccessTokenSilently(clientId)

      if (refreshed && isTokenValid()) {
        setNeedsReauth(false)

        return
      }
    }
    setNeedsReauth(true)
  }, [clientId, canRefreshSilently])

  useEffect(() => {
    registerHandlers({ onReauth: handleReauth, onLogout: handleLogout })
  }, [handleLogout, handleReauth, registerHandlers])

  useTokenRefresh({
    clientId,
    enabled: hasStoredSession(),
    onRefreshFailed: () => {
      if (loggedIn) setNeedsReauth(true)
    },
    onRefreshSuccess: () => {
      if (isTokenValid()) setNeedsReauth(false)
    }
  })

  // Returning users see their cached data at once; token renewal, sheet checks
  // and the first sync then run behind it instead of in front of it.
  useEffect(() => {
    let cancelled = false

    const cachedId = getSettings()?.spreadsheetId

    if (dataUnlocked && hasStoredSession() && cachedId) {
      void hydrateStore(cachedId).then(() => {
        if (!cancelled && hasStoreData(cachedId)) {
          setLoggedIn(true)
          setReady(true)
        }
      })
    }

    return () => {
      cancelled = true
    }
  }, [dataUnlocked])

  useEffect(() => {
    let cancelled = false

    const canTryRefresh = hasStoredSession() && !isTokenValid()

    if (!dataUnlocked || (canTryRefresh && !canRefreshSilently)) return

    async function init() {
      let tokenValid = isTokenValid()

      if (!tokenValid && hasStoredSession()) {
        const refreshed = await refreshAccessTokenSilently(clientId)

        tokenValid = refreshed && isTokenValid()
      }

      if (!tokenValid) {
        startupDoneRef.current = true
        if (!cancelled) {
          setLoggedIn(false)
          setNeedsReauth(isConfigured())
          setNeedsSheetSetup(false)
          setReady(true)
        }

        return
      }

      try {
        const session = await resolveSpreadsheetSession()

        if (session.status === 'ready') {
          await prepareUserSpreadsheet()

          const settings = getSettings()

          if (settings?.spreadsheetId) {
            await initializeSheetSync(settings.spreadsheetId)
            void scrubPinHashFromSheetOnce().catch(() => undefined)
          }
          if (!cancelled) {
            setLoggedIn(true)
            setNeedsReauth(false)
            setNeedsSheetSetup(false)
            setSheetError('')
          }
        } else if (!cancelled) {
          setLoggedIn(false)
          setNeedsReauth(false)
          setNeedsSheetSetup(true)
          setSheetSetupMode(session.status === 'need_selection' ? 'pick' : 'create')
          setSheetOptions(session.status === 'need_selection' ? session.options : [])
          setSheetError('')
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'خطا در اتصال به گوگل شیت'

          if (isAuthError(err)) {
            setLoggedIn(false)
            setNeedsReauth(true)
            setNeedsSheetSetup(false)
          } else if (isTokenValid()) {
            setLoggedIn(true)
            setNeedsReauth(false)
            setNeedsSheetSetup(false)
          } else {
            setLoggedIn(false)
            setNeedsReauth(true)
            setNeedsSheetSetup(false)
          }
          setSheetError(message)
        }
      }

      startupDoneRef.current = true
      if (!cancelled) setReady(true)
    }

    init()
    if (!isNativePlatform()) registerSW()

    return () => {
      cancelled = true
    }
  }, [clientId, canRefreshSilently, dataUnlocked])

  const handleSheetSetupComplete = async () => {
    const settings = getSettings()

    if (settings?.spreadsheetId) {
      await initializeSheetSync(settings.spreadsheetId)
    }
    setLoggedIn(true)
    setNeedsSheetSetup(false)
    setSheetError('')
  }

  if (!isOAuthConfigured) return <ConfigNotice />
  // The PIN comes before anything else, including the cached data.
  if (locked && hasStoredSession()) return <UnlockScreen onUnlock={handleUnlock} />
  if (!ready) return <AppLoadingSkeleton />

  if (needsSheetSetup && isTokenValid()) {
    return (
      <SpreadsheetSetupPanel
        mode={sheetSetupMode}
        options={sheetOptions}
        defaultLabel={getDefaultFirstSheetLabel()}
        onComplete={handleSheetSetupComplete}
      />
    )
  }

  if (!loggedIn || needsReauth) {
    return (
      <LoginPage
        initialError={sheetError}
        onSuccess={() => {
          setLoggedIn(true)
          setNeedsReauth(false)
          setNeedsSheetSetup(false)
          setSheetError('')
        }}
      />
    )
  }

  if (locked) return <UnlockScreen onUnlock={handleUnlock} />

  return (
    <>
      <AppAuthenticatedRoutes />
      <AppLockPrompts />
    </>
  )
}
