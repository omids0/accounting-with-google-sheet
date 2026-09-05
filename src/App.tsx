import { useGoogleOAuth } from '@react-oauth/google'
import { useState, useEffect, useCallback } from 'react'
import { registerSW } from 'virtual:pwa-register'

import AppIcon from './components/AppIcon'
import LoginPage from './components/LoginPage'
import { AppLoadingSkeleton } from './components/skeleton'
import SpreadsheetSetupPanel from './components/SpreadsheetSetupPanel'
import UnlockScreen from './components/UnlockScreen'
import { useAppLock } from './hooks/useAppLock'
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
import type { SpreadsheetEntry } from './types'

function ConfigNotice() {
  return (
    <div className="login-page">
      <div className="login-card animate-in">
        <div className="login-logo">
          <span className="icon">
            <AppIcon name="warning" />
          </span>
          <h1>تنظیمات Google OAuth</h1>
          <p>
            <code dir="ltr">VITE_GOOGLE_CLIENT_ID</code> در فایل <code dir="ltr">.env</code> تنظیم
            نشده.
          </p>
        </div>
        <div
          className="alert alert-info"
          dir="ltr"
          style={{ textAlign: 'left', fontSize: '0.75rem' }}
        >
          VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
        </div>
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

    registerSW({
      onNeedRefresh() {
        if (confirm('نسخه جدید موجود است. بروزرسانی شود؟')) {
          window.location.reload()
        }
      }
    })

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

  if (!isOAuthConfigured) return <ConfigNotice />
  if (!ready) {
    return <AppLoadingSkeleton />
  }

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

  if (locked) {
    return <UnlockScreen onUnlock={unlock} />
  }

  return (
    <AppAuthenticatedRoutes
      onLogout={() => {
        setLoggedIn(false)
        setNeedsReauth(false)
        setNeedsSheetSetup(false)
      }}
      onReauth={handleReauth}
    />
  )
}
