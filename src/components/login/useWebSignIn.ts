import { useState } from 'react'

import { useGoogleCodeLogin } from '../../hooks/useGoogleCodeLogin'
import { useGoogleTokenLogin } from '../../hooks/useGoogleTokenLogin'
import { useScriptStalled } from '../../hooks/useScriptStalled'
import { fetchUserProfile, getAuthSessionId, hasRequiredGoogleScopes } from '../../services/auth'
import {
  AuthWorkerUnavailableError,
  exchangeAuthCode,
  forgetWorkerSession,
  isAuthWorkerEnabled
} from '../../services/authWorker'
import { showError, showInfo } from '../../utils/toast'
import { toUserMessage } from '../../utils/userMessage'

type CompleteSignIn = (
  accessToken: string,
  profile: { email: string; name: string; picture?: string },
  expiresIn: number | undefined,
  scope: string,
  authSessionId?: string
) => Promise<void>

interface WebGrant {
  access_token: string
  expires_in?: number
  scope: string
  /** Set only when the refresh-token worker holds a refresh token for this sign-in. */
  sessionId?: string
}

/**
 * Web sign-in through Google's popup. With the refresh-token worker configured the popup
 * returns a code that the worker trades for tokens (so later renewals need no popup);
 * otherwise, or when the worker cannot be reached, it returns a token as it always did.
 */
export function useWebSignIn(complete: CompleteSignIn, setLoading: (loading: boolean) => void) {
  // One failed exchange switches this page to the plain token sign-in, so a broken
  // worker never locks anybody out.
  const [workerDown, setWorkerDown] = useState(false)

  const [scriptAttempt, setScriptAttempt] = useState(0)

  const viaWorker = isAuthWorkerEnabled() && !workerDown

  // Check the grant, read the profile, save the session.
  const finish = async (grant: WebGrant) => {
    setLoading(true)
    try {
      // Google's granular consent lets the user untick drive.file; saving such a
      // session would only bounce them back here, so stop and say why.
      if (!hasRequiredGoogleScopes(grant.scope)) {
        // Only the stored copy goes: revoking would also end a working grant of this user.
        if (grant.sessionId) void forgetWorkerSession(grant.sessionId)
        showError(
          'بدون اجازهٔ «فایل‌هایی که این اپ می‌سازد» اپ نمی‌تواند داده‌ها را ذخیره کند. دوباره وارد شوید و این گزینه را تیک بزنید.'
        )

        return
      }

      const profile = await fetchUserProfile(grant.access_token)

      await complete(grant.access_token, profile, grant.expires_in, grant.scope, grant.sessionId)
    } catch (err) {
      // Unless the session was already saved, nothing will ever use this worker copy.
      if (grant.sessionId && getAuthSessionId() !== grant.sessionId) {
        void forgetWorkerSession(grant.sessionId)
      }
      showError(toUserMessage(err, 'خطا در ورود'))
    } finally {
      setLoading(false)
    }
  }

  const onError = () => {
    showError('ورود لغو شد یا با خطا مواجه شد')
    setLoading(false)
  }

  const tokenLogin = useGoogleTokenLogin({
    // Ask for drive.file only; older broad grants must not ride along in the token.
    includeGrantedScopes: false,
    load: !viaWorker,
    retryKey: scriptAttempt,
    onSuccess: grant => void finish(grant),
    onError
  })

  const codeLogin = useGoogleCodeLogin({
    load: viaWorker,
    retryKey: scriptAttempt,
    onCode: async code => {
      setLoading(true)
      try {
        await finish(await exchangeAuthCode(code))
      } catch (err) {
        if (err instanceof AuthWorkerUnavailableError) {
          // A new popup needs a new click, so the next one uses the plain token sign-in.
          setWorkerDown(true)
          showInfo('ورود با روش جایگزین؛ دوباره روی «ورود با Google» بزنید.')
        } else {
          showError(toUserMessage(err, 'خطا در ورود'))
        }
        setLoading(false)
      }
    },
    onError
  })

  const active = viaWorker ? codeLogin : tokenLogin

  const stalled = useScriptStalled(active.ready, scriptAttempt)

  return {
    login: active.login,
    ready: active.ready,
    stalled,
    /** Fetch Google's script again after a failed download. */
    retryScript: () => setScriptAttempt(attempt => attempt + 1)
  }
}
