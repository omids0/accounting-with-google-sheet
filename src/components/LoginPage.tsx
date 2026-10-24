import { useState, useEffect } from 'react'

import AppIcon from './AppIcon'
import ConfirmActionModal from './ConfirmActionModal'
import GoogleSignInButton from './login/GoogleSignInButton'
import { LoginFeatures, LoginFooter } from './login/LoginPitch'
import SessionExpiredNotice from './login/SessionExpiredNotice'
import { useWebSignIn } from './login/useWebSignIn'
import SpreadsheetSetupPanel from './SpreadsheetSetupPanel'
import Alert from './ui/Alert'
import { animateInClass } from './ui/layoutStyles'
import {
  loginCardClass,
  loginLogoClass,
  loginLogoIconClass,
  loginLogoSubtitleClass,
  loginLogoTitleClass,
  loginPageClass
} from './ui/loginStyles'
import { useAccountSwitchGuard } from '../hooks/useLocalDataWipe'
import {
  createSession,
  getAuthSessionId,
  saveSession,
  sessionNeedsScopeUpgrade
} from '../services/auth'
import { forgetWorkerSession, logoutViaWorker } from '../services/authWorker'
import { isNativePlatform, signInNative, signOutNative } from '../services/googleAuthNative'
import type { LoginReason } from '../services/loginReason'
import { resetRefreshStatus } from '../services/refreshStatus'
import {
  getDefaultFirstSheetLabel,
  prepareUserSpreadsheet,
  resolveSpreadsheetSession
} from '../services/spreadsheetSetup'
import type { SpreadsheetEntry } from '../types'
import { cn } from '../utils/cn'
import { showError } from '../utils/toast'
import { toUserMessage } from '../utils/userMessage'

type Step = 'login' | 'setup'

interface LoginPageProps {
  onSuccess: () => void
  initialError?: string
  reason?: LoginReason
}

export default function LoginPage({ onSuccess, initialError = '', reason }: LoginPageProps) {
  // A returning user whose session ran out gets a short note, not the sign-in pitch.
  const expired = reason === 'expired'

  const [loading, setLoading] = useState(false)

  const [step, setStep] = useState<Step>('login')

  const [setupMode, setSetupMode] = useState<'pick' | 'create'>('pick')

  const [sheetOptions, setSheetOptions] = useState<SpreadsheetEntry[]>([])

  const [defaultLabel, setDefaultLabel] = useState('اصلی')

  // A session from before the drive.file switch: say why sign-in is needed again.
  const [scopeUpgrade] = useState(sessionNeedsScopeUpgrade)

  const { guardAccountSwitch, modalProps: switchModalProps } = useAccountSwitchGuard()

  useEffect(() => {
    if (initialError) showError(initialError)
  }, [initialError])

  const continueAfterAuth = async (profileName: string) => {
    const session = await resolveSpreadsheetSession()

    if (session.status === 'ready') {
      await prepareUserSpreadsheet(profileName)
      onSuccess()

      return
    }

    setDefaultLabel(getDefaultFirstSheetLabel())
    if (session.status === 'need_selection') {
      setSheetOptions(session.options)
      setSetupMode('pick')
    } else {
      setSheetOptions([])
      setSetupMode('create')
    }
    setStep('setup')
  }

  const completeSignIn = async (
    accessToken: string,
    profile: { email: string; name: string; picture?: string },
    expiresIn: number | undefined,
    scope: string,
    authSessionId?: string
  ) => {
    const outcome = await guardAccountSwitch(profile.email)

    if (outcome === 'cancelled') {
      await signOutNative()
      if (authSessionId) void logoutViaWorker(authSessionId)
      showError('ورود لغو شد؛ اطلاعات حساب قبلی روی این دستگاه باقی ماند')

      return
    }

    // The same account signing in again replaces its worker session: forget the old copy
    // (without revoking, which would end the fresh grant as well).
    const previousId = getAuthSessionId()

    if (previousId && previousId !== authSessionId) void forgetWorkerSession(previousId)

    saveSession(createSession(accessToken, profile, expiresIn, scope, authSessionId))
    resetRefreshStatus()

    if (outcome === 'switched') {
      // Start clean so nothing cached in memory from the previous account survives.
      window.location.reload()

      return
    }

    await continueAfterAuth(profile.name)
  }

  const web = useWebSignIn(completeSignIn, setLoading)

  // The APK signs in through the native plugin and needs no Google script.
  const native = isNativePlatform()

  const handleNativeLogin = async () => {
    setLoading(true)
    try {
      const { accessToken, profile, scope } = await signInNative()

      await completeSignIn(accessToken, profile, undefined, scope)
    } catch (err) {
      const code = (err as { code?: string })?.code

      const message = toUserMessage(err, 'ورود لغو شد یا با خطا مواجه شد')

      showError(code ? `${message} (کد ${code})` : message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = () => {
    if (isNativePlatform()) {
      void handleNativeLogin()

      return
    }
    // Google's script did not load: this click tries to fetch it again.
    if (!web.ready) {
      web.retryScript()

      return
    }
    setLoading(true)
    web.login()
  }

  if (step === 'setup') {
    return (
      <SpreadsheetSetupPanel
        mode={setupMode}
        options={sheetOptions}
        defaultLabel={defaultLabel}
        onComplete={onSuccess}
      />
    )
  }

  return (
    <div className={loginPageClass}>
      <div className={cn(loginCardClass, animateInClass)}>
        <div className={loginLogoClass}>
          <span className={loginLogoIconClass}>
            <AppIcon name="dashboard" />
          </span>
          <h1 className={loginLogoTitleClass}>حساب کتاب</h1>
          {!expired && (
            <p className={loginLogoSubtitleClass}>
              مدیریت مالی روزانه با ذخیره‌سازی امن در Google Sheets
            </p>
          )}
        </div>

        {expired && <SessionExpiredNotice />}

        {scopeUpgrade && (
          <Alert variant="info">
            برای امنیت بیشتر، دسترسی اپ به گوگل محدودتر شد؛ یک‌بار دوباره وارد شوید. از این پس اپ
            فقط به شیت‌هایی که خودش ساخته دسترسی دارد، نه به بقیهٔ Drive شما.
          </Alert>
        )}

        {!expired && <LoginFeatures />}

        <GoogleSignInButton
          onClick={handleLogin}
          ready={native || web.ready}
          stalled={!native && web.stalled}
          loading={loading}
        />

        {!expired && <LoginFooter />}
      </div>
      <ConfirmActionModal {...switchModalProps} />
    </div>
  )
}
