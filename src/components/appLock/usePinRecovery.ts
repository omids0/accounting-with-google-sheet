import { useGoogleLogin, useGoogleOAuth } from '@react-oauth/google'
import { useCallback, useState } from 'react'

import { unsyncedLossWarning, type WipeConfirmModalProps } from '../../hooks/useLocalDataWipe'
import { recoverPinWithGoogleToken } from '../../services/appLockRecovery'
import { GOOGLE_OAUTH_SCOPE, getUserEmail } from '../../services/auth'
import { isNativePlatform, signInNative } from '../../services/googleAuthNative'
import { getPendingSyncCount } from '../../services/localDataWipe'

const CANCELLED_MESSAGE = 'ورود با گوگل انجام نشد؛ چیزی از این دستگاه پاک نشد.'

function recoveryMessage(email: string, pendingCount: number): string {
  const intro = `برای برداشتن قفل، دوباره با همان حساب گوگل (${email}) وارد شوید. نسخهٔ اطلاعات روی این دستگاه و رمز قفل پاک می‌شود و بعد از ورود، اطلاعات دوباره از گوگل شیت دریافت می‌شود؛ خود گوگل شیت دست نمی‌خورد.`

  return pendingCount ? `${intro} ${unsyncedLossWarning(pendingCount)}` : intro
}

/**
 * «رمز را فراموش کرده‌ام»: confirm (with the unsynced-changes warning), then an
 * interactive Google sign-in. Only the account stored on this device can wipe
 * the lock; see recoverPinWithGoogleToken.
 */
export function usePinRecovery() {
  const [open, setOpen] = useState(false)

  const [pendingCount, setPendingCount] = useState(0)

  const [working, setWorking] = useState(false)

  const [error, setError] = useState('')

  const email = getUserEmail() ?? ''

  const { scriptLoadedSuccessfully } = useGoogleOAuth()

  const fail = useCallback((message: string) => {
    setError(message)
    setWorking(false)
  }, [])

  const finish = useCallback(
    async (accessToken: string, expiresIn?: number) => {
      try {
        const outcome = await recoverPinWithGoogleToken(accessToken, expiresIn)

        if (outcome === 'mismatch') {
          fail(`حساب انتخاب‌شده با حساب این دستگاه (${email}) یکی نیست؛ چیزی پاک نشد.`)

          return
        }

        window.location.reload()
      } catch (err) {
        fail(err instanceof Error ? err.message : CANCELLED_MESSAGE)
      }
    },
    [email, fail]
  )

  const webSignIn = useGoogleLogin({
    scope: GOOGLE_OAUTH_SCOPE,
    prompt: 'select_account',
    hint: email,
    onSuccess: response => void finish(response.access_token, response.expires_in),
    onError: () => fail(CANCELLED_MESSAGE),
    onNonOAuthError: () => fail(CANCELLED_MESSAGE)
  })

  const start = useCallback(() => {
    setError('')
    setPendingCount(getPendingSyncCount())
    setOpen(true)
  }, [])

  // Runs inside the click so the browser allows Google's sign-in popup.
  const confirm = () => {
    setOpen(false)
    setWorking(true)
    setError('')

    if (!isNativePlatform()) {
      // Without Google's script the popup never opens; say so instead of waiting.
      if (!scriptLoadedSuccessfully) {
        fail('ورود با گوگل در دسترس نیست؛ اتصال اینترنت را بررسی کنید.')

        return
      }
      webSignIn()

      return
    }

    signInNative().then(
      ({ accessToken }) => finish(accessToken),
      () => fail(CANCELLED_MESSAGE)
    )
  }

  const modalProps: WipeConfirmModalProps = {
    open,
    title: 'فراموشی رمز قفل',
    message: recoveryMessage(email, pendingCount),
    confirmLabel: pendingCount ? 'ورود با گوگل و حذف تغییرات' : 'ورود با گوگل',
    cancelLabel: 'انصراف',
    confirming: false,
    onClose: () => setOpen(false),
    onConfirm: confirm
  }

  return { start, modalProps, working, error }
}
