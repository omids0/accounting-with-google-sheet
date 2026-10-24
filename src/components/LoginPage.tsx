import { useState, useEffect } from 'react'

import AppIcon from './AppIcon'
import ConfirmActionModal from './ConfirmActionModal'
import GoogleSignInButton from './login/GoogleSignInButton'
import SessionExpiredNotice from './login/SessionExpiredNotice'
import SpreadsheetSetupPanel from './SpreadsheetSetupPanel'
import Alert from './ui/Alert'
import { animateInClass } from './ui/layoutStyles'
import {
  loginCardClass,
  loginFeatureClass,
  loginFeatureIconClass,
  loginFeaturesClass,
  loginFooterNoteClass,
  loginLogoClass,
  loginLogoIconClass,
  loginLogoSubtitleClass,
  loginLogoTitleClass,
  loginPageClass,
  loginTrustBadgeClass
} from './ui/loginStyles'
import { useGoogleTokenLogin } from '../hooks/useGoogleTokenLogin'
import { useAccountSwitchGuard } from '../hooks/useLocalDataWipe'
import {
  createSession,
  fetchUserProfile,
  hasRequiredGoogleScopes,
  saveSession,
  sessionNeedsScopeUpgrade
} from '../services/auth'
import { isNativePlatform, signInNative, signOutNative } from '../services/googleAuthNative'
import type { LoginReason } from '../services/loginReason'
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
    scope: string
  ) => {
    const outcome = await guardAccountSwitch(profile.email)

    if (outcome === 'cancelled') {
      await signOutNative()
      showError('ورود لغو شد؛ اطلاعات حساب قبلی روی این دستگاه باقی ماند')

      return
    }

    saveSession(createSession(accessToken, profile, expiresIn, scope))

    if (outcome === 'switched') {
      // Start clean so nothing cached in memory from the previous account survives.
      window.location.reload()

      return
    }

    await continueAfterAuth(profile.name)
  }

  const { login, ready } = useGoogleTokenLogin({
    // Ask for drive.file only; older broad grants must not ride along in the token.
    includeGrantedScopes: false,
    onSuccess: async tokenResponse => {
      setLoading(true)
      try {
        // Google's granular consent lets the user untick drive.file; saving such a
        // session would only bounce them back here, so stop and say why.
        if (!hasRequiredGoogleScopes(tokenResponse.scope)) {
          showError(
            'بدون اجازهٔ «فایل‌هایی که این اپ می‌سازد» اپ نمی‌تواند داده‌ها را ذخیره کند. دوباره وارد شوید و این گزینه را تیک بزنید.'
          )

          return
        }

        const profile = await fetchUserProfile(tokenResponse.access_token)

        await completeSignIn(
          tokenResponse.access_token,
          profile,
          tokenResponse.expires_in,
          tokenResponse.scope
        )
      } catch (err) {
        showError(toUserMessage(err, 'خطا در ورود'))
      } finally {
        setLoading(false)
      }
    },
    onError: () => {
      showError('ورود لغو شد یا با خطا مواجه شد')
      setLoading(false)
    }
  })

  // The APK signs in through the native plugin and needs no Google script.
  const signInReady = ready || isNativePlatform()

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
    setLoading(true)
    login()
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

        {!expired && (
          <ul className={loginFeaturesClass} aria-label="ویژگی‌های اصلی">
            <li className={loginFeatureClass}>
              <span className={loginFeatureIconClass} aria-hidden="true">
                <AppIcon name="chart" size={16} />
              </span>
              داشبورد مالی با نمودار درآمد و هزینه
            </li>
            <li className={loginFeatureClass}>
              <span className={loginFeatureIconClass} aria-hidden="true">
                <AppIcon name="folder" size={16} />
              </span>
              همگام‌سازی خودکار بین دستگاه‌ها
            </li>
            <li className={loginFeatureClass}>
              <span className={loginFeatureIconClass} aria-hidden="true">
                <AppIcon name="wallet" size={16} />
              </span>
              اقساط، چک، طلب و صندوقچه در یک جا
            </li>
          </ul>
        )}

        <GoogleSignInButton onClick={handleLogin} ready={signInReady} loading={loading} />

        {!expired && (
          <>
            <p className={loginFooterNoteClass}>
              شیت‌ها با فرمت «حسابداری · سال» ساخته می‌شوند و روی Drive همگام هستند
            </p>

            <div className={loginTrustBadgeClass}>
              <AppIcon name="check" size={14} />
              <span>داده‌ها فقط در Google Drive شما ذخیره می‌شوند</span>
            </div>
          </>
        )}
      </div>
      <ConfirmActionModal {...switchModalProps} />
    </div>
  )
}
