import { isNativePlatform } from './googleAuthNative'

const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client'

/** A stalled download must not hold a token renewal (and the API call behind it) forever. */
const GIS_LOAD_TIMEOUT_MS = 10_000

let gisLoading: Promise<boolean> | null = null

function gisAvailable(): boolean {
  return !!window.google?.accounts?.oauth2
}

/**
 * Google's web sign-in script (~270 kB) is fetched only when a web sign-in,
 * silent token renewal or revoke actually needs it, not on every start. The
 * APK signs in through the native plugin and never loads it.
 */
export function loadGoogleIdentityScript(): Promise<boolean> {
  if (isNativePlatform()) return Promise.resolve(false)
  if (gisAvailable()) return Promise.resolve(true)

  gisLoading ??= new Promise<boolean>(resolve => {
    const script = document.createElement('script')

    let timer = 0

    const settle = (ok: boolean) => {
      window.clearTimeout(timer)
      // A failed or slow load may be retried by the next caller.
      if (!ok) gisLoading = null
      resolve(ok)
    }

    timer = window.setTimeout(() => settle(gisAvailable()), GIS_LOAD_TIMEOUT_MS)
    script.src = GIS_SCRIPT_URL
    script.async = true
    script.defer = true
    script.onload = () => settle(gisAvailable())
    script.onerror = () => {
      script.remove()
      settle(false)
    }
    document.body.appendChild(script)
  })

  return gisLoading
}
