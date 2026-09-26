import { Capacitor } from '@capacitor/core'
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth'

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
}> {
  const user = await GoogleAuth.signIn()

  return {
    accessToken: user.authentication.accessToken,
    profile: { email: user.email, name: user.name, picture: user.imageUrl }
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
