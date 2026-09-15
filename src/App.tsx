import { useGoogleOAuth } from '@react-oauth/google'
import { useState, useEffect, useCallback } from 'react'

import AppIcon from './components/AppIcon'
import AppUpdateModal from './components/AppUpdateModal'
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
import { useAppUpdate } from './hooks/useAppUpdate'
import { useTokenRefresh } from './hooks/useTokenRefresh'
import { AppAuthenticatedRoutes } from './routes/AppRoutes'
import { syncAppLockFromSheet } from './services/appLock'
import { hasStoredSession, isAuthError, isTokenValid } from './services/auth'
import { isConfigured, getSettings } from './services/settings'
import { initializeSheetSync } from './services/sheetSync'
import {
  getDefaultFirstSheetLabel,
  prepareUserSpreadsheet,
  resolveSpreadsheetSession
} from './services/spreadsheetSetup'
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

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

  const isOAuthConfigured = !!clientId && !clientId.startsWith('xxx')

  const { scriptLoadedSuccessfully } = useGoogleOAuth()

  const { locked, unlock } = useAppLock()
  const { showPrompt, applying, applyUpdate, dismissUpdate } = useAppUpdate(locked)

  const registerHandlers = useAppStore(state => state.registerHandlers)

  const handleLogout = useCallback(() => {
    setLoggedIn(false)
    setNeedsReauth(false)
    setNeedsSheetSetup(false)
  }, [])

  const handleReauth = useCallback(async () => {
    if (scriptLoadedSuccessfully && hasStoredSession()) {
      const refreshed = await refreshAccessTokenSilently(clientId)

      if (refreshed && isTokenValid()) {
        setNeedsReauth(false)

        return
      }
    }
    setNeedsReauth(true)
  }, [clientId, scriptLoadedSuccessfully])

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

  useEffect(() => {
    let cancelled = false

    const canTryRefresh = hasStoredSession() && !isTokenValid()

    if (canTryRefresh && !scriptLoadedSuccessfully) return

    async function init() {
      let tokenValid = isTokenValid()

      if (!tokenValid && hasStoredSession()) {
        const refreshed = await refreshAccessTokenSilently(clientId)

        tokenValid = refreshed && isTokenValid()
      }

      if (!tokenValid) {
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
          await syncAppLockFromSheet()

          const settings = getSettings()

          if (settings?.spreadsheetId) {
            await initializeSheetSync(settings.spreadsheetId)
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

      if (!cancelled) setReady(true)
    }

    init()

    return () => {
      cancelled = true
    }
  }, [clientId, scriptLoadedSuccessfully])

  const handleSheetSetupComplete = async () => {
    await syncAppLockFromSheet()

    const settings = getSettings()

    if (settings?.spreadsheetId) {
      await initializeSheetSync(settings.spreadsheetId)
    }
    setLoggedIn(true)
    setNeedsSheetSetup(false)
    setSheetError('')
  }

  const updateModal = (
    <AppUpdateModal
      open={showPrompt}
      applying={applying}
      onApply={applyUpdate}
      onDismiss={dismissUpdate}
    />
  )

  if (!isOAuthConfigured) return <ConfigNotice />
  if (!ready) {
    return (
      <>
        {updateModal}
        <AppLoadingSkeleton />
      </>
    )
  }

  if (needsSheetSetup && isTokenValid()) {
    return (
      <>
        {updateModal}
        <SpreadsheetSetupPanel
          mode={sheetSetupMode}
          options={sheetOptions}
          defaultLabel={getDefaultFirstSheetLabel()}
          onComplete={handleSheetSetupComplete}
        />
      </>
    )
  }

  if (!loggedIn || needsReauth) {
    return (
      <>
        {updateModal}
        <LoginPage
          initialError={sheetError}
          onSuccess={() => {
            setLoggedIn(true)
            setNeedsReauth(false)
            setNeedsSheetSetup(false)
            setSheetError('')
          }}
        />
      </>
    )
  }

  if (locked) {
    return (
      <>
        {updateModal}
        <UnlockScreen onUnlock={unlock} />
      </>
    )
  }

  return (
    <>
      {updateModal}
      <AppAuthenticatedRoutes />
    </>
  )
}
