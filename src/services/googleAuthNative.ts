import { Capacitor } from '@capacitor/core'
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth'

import { NATIVE_GOOGLE_SCOPES } from './auth'

/** Google's WebView OAuth block means the web GSI flow only works outside native shells. */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform()
}

export async function initializeNativeGoogleAuth(): Promise<void> {
  if (!isNativePlatform()) return
  await GoogleAuth.initialize()
}

export async function signInNative(): Promise<{
  accessToken: string
  profile: { email: string; name: string; picture?: string }
  scope: string
}> {
  const user = await GoogleAuth.signIn()

  return {
    accessToken: user.authentication.accessToken,
    profile: { email: user.email, name: user.name, picture: user.imageUrl },
    // The plugin does not report scopes; Android's sign-in only succeeds once the
    // user has granted every scope from capacitor.config.ts.
    scope: NATIVE_GOOGLE_SCOPES.join(' ')
  }
}

/** Forgets the native Google account so the next sign-in shows the account picker. */
export async function signOutNative(): Promise<void> {
  if (!isNativePlatform()) return
  try {
    await GoogleAuth.signOut()
  } catch {
    // Sign-out is best effort; local data is already gone.
  }
}

export async function refreshNativeToken(): Promise<string | null> {
  try {
    const { accessToken } = await GoogleAuth.refresh()

    return accessToken || null
  } catch {
    return null
  }
}
