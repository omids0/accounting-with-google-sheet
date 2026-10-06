import { offerLockSetup } from './appLockPrompts'
import { createSession, fetchUserProfile, getUserEmail, saveSession } from './auth'
import { isNativePlatform, signOutNative } from './googleAuthNative'
import { clearAllLocalData } from './localDataWipe'
import { sameEmail } from '../utils/email'

export type PinRecoveryOutcome = 'recovered' | 'mismatch'

/**
 * Forgot-PIN, after a fresh interactive Google sign-in. The account is read
 * from Google with the new token (never taken from the sign-in widget), and
 * only the account already stored on this device may recover it. On a match
 * the device copy, outbox and lock are wiped (the new token is kept, not
 * revoked) and the new session is saved; the caller then reloads so the data
 * is downloaded again from Google Sheets. On a mismatch nothing is wiped.
 */
export async function recoverPinWithGoogleToken(
  accessToken: string,
  expiresIn?: number
): Promise<PinRecoveryOutcome> {
  const expectedEmail = getUserEmail()

  if (!expectedEmail) throw new Error('حسابی روی این دستگاه ذخیره نشده است')

  const profile = await fetchUserProfile(accessToken)

  if (!sameEmail(expectedEmail, profile.email)) {
    // The native plugin now holds the other account; leaving it would let a
    // silent token refresh hand that account's token to the stored session.
    if (isNativePlatform()) await signOutNative()

    return 'mismatch'
  }

  await clearAllLocalData({ revokeAccess: false })
  saveSession(createSession(accessToken, profile, expiresIn))
  offerLockSetup()

  return 'recovered'
}
