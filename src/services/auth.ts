import { getItem, setItem, STORAGE_KEYS } from './storage'
import type { GoogleSession } from '../types'

/**
 * Non-sensitive per Google's Sheets API scope table: the app sees only the files
 * it created or the user opened with it, never the rest of Drive. The sensitive
 * scopes used before (spreadsheets, drive.metadata.readonly) need verification.
 */
export const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file'

export const GOOGLE_OAUTH_SCOPE = `openid email profile ${DRIVE_FILE_SCOPE}`

/** Must match @react-oauth/google implicit-flow scope prefix. */
export const FULL_GOOGLE_OAUTH_SCOPE = `openid profile email ${GOOGLE_OAUTH_SCOPE}`

/** The Android plugin takes a list; capacitor.config.ts must request the same. */
export const NATIVE_GOOGLE_SCOPES = ['email', 'profile', 'openid', DRIVE_FILE_SCOPE]

/** True when a space-separated grant (token response `scope`) covers what the app needs. */
export function hasRequiredGoogleScopes(granted: string | undefined | null): boolean {
  return !!granted && granted.split(/\s+/).includes(DRIVE_FILE_SCOPE)
}

/** Refresh access token this long before Google expiry. */
export const TOKEN_REFRESH_BUFFER_MS = 5 * 60_000

export function saveSession(session: GoogleSession): void {
  setItem(STORAGE_KEYS.SESSION, session)
}

export function getSession(): GoogleSession | null {
  return getItem<GoogleSession>(STORAGE_KEYS.SESSION)
}

/** Small grace for clock skew; proactive refresh runs at TOKEN_REFRESH_BUFFER_MS. */
const TOKEN_VALIDITY_GRACE_MS = 5_000

export function isTokenValid(): boolean {
  const session = getSession()

  if (!session?.accessToken || !session?.tokenExpiry) return false
  // A token granted for the old broad scopes is retired: one sign-in replaces it.
  if (!hasRequiredGoogleScopes(session.scope)) return false

  return Date.now() < session.tokenExpiry - TOKEN_VALIDITY_GRACE_MS
}

/**
 * Sessions saved before the switch to drive.file carry no `scope` (or only the
 * old broad ones), and Google will not renew them without a new consent.
 */
export function sessionNeedsScopeUpgrade(): boolean {
  const session = getSession()

  return !!session?.accessToken && !hasRequiredGoogleScopes(session.scope)
}

export function isAuthError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)

  // Google answers an expired access token with prose, not a status code, so the
  // wording it actually uses has to be matched here.
  return /منقضی|401|invalid credentials|invalid authentication credentials|expected oauth ?2|unauthenticated|invalid_grant|invalid_token/i.test(
    msg
  )
}

export function hasStoredSession(): boolean {
  const session = getSession()

  return !!(session?.email && session?.accessToken)
}

export function shouldRefreshToken(): boolean {
  const session = getSession()

  if (!session?.accessToken || !session?.tokenExpiry) return false

  return Date.now() >= session.tokenExpiry - TOKEN_REFRESH_BUFFER_MS
}

export function getMsUntilTokenRefresh(): number | null {
  const session = getSession()

  if (!session?.tokenExpiry) return null

  return Math.max(0, session.tokenExpiry - TOKEN_REFRESH_BUFFER_MS - Date.now())
}

export function renewSessionToken(accessToken: string, expiresIn = 3600): void {
  const session = getSession()

  if (!session) return
  saveSession({
    ...session,
    accessToken,
    tokenExpiry: Date.now() + expiresIn * 1000
  })
}

export function getAccessToken(): string {
  const session = getSession()

  if (!session?.accessToken || !isTokenValid()) {
    throw new Error('نشست منقضی شده. دوباره وارد شوید')
  }

  return session.accessToken
}

export function getUserName(): string | null {
  const session = getSession()

  return session?.name || session?.email || null
}

export function getUserEmail(): string | null {
  return getSession()?.email ?? null
}

export function getUserPicture(): string | null {
  return getSession()?.picture ?? null
}

export async function fetchUserProfile(accessToken: string): Promise<{
  email: string
  name: string
  picture?: string
}> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` }
  })

  if (!res.ok) throw new Error('دریافت اطلاعات کاربر ناموفق بود')

  const data = (await res.json()) as {
    email?: string
    name?: string
    picture?: string
  }

  return {
    email: data.email ?? '',
    name: data.name || data.email || '',
    picture: data.picture
  }
}

export function createSession(
  accessToken: string,
  profile: { email: string; name: string; picture?: string },
  expiresIn = 3600,
  scope?: string
): GoogleSession {
  return {
    email: profile.email,
    name: profile.name,
    picture: profile.picture,
    accessToken,
    tokenExpiry: Date.now() + expiresIn * 1000,
    scope
  }
}
