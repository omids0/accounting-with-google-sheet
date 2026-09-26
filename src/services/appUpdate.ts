import { App } from '@capacitor/app'
import { CapacitorHttp } from '@capacitor/core'

import { isNativePlatform } from './googleAuthNative'
import { getItem, setItem } from './storage'

/** Published by the APK build workflow as a GitHub release asset. */
const VERSION_MANIFEST_URL =
  'https://github.com/omids0/accounting-with-google-sheet/releases/latest/download/version.json'

const DISMISSED_KEY = 'accounting_update_dismissed'

export interface AvailableUpdate {
  versionCode: number
  versionName: string
  apkUrl: string
}

function parseManifest(data: unknown): AvailableUpdate | null {
  const raw = typeof data === 'string' ? (JSON.parse(data) as unknown) : data

  if (!raw || typeof raw !== 'object') return null

  const { versionCode, versionName, apkUrl } = raw as Record<string, unknown>

  if (typeof versionCode !== 'number' || typeof apkUrl !== 'string') return null

  return {
    versionCode,
    versionName: typeof versionName === 'string' ? versionName : String(versionCode),
    apkUrl
  }
}

/** Resolves to null when up to date, offline, or running outside the APK. */
export async function checkForUpdate(): Promise<AvailableUpdate | null> {
  if (!isNativePlatform()) return null

  try {
    const installed = Number((await App.getInfo()).build)

    // CapacitorHttp runs the request natively, so the WebView's origin rules don't apply.
    const response = await CapacitorHttp.get({
      url: VERSION_MANIFEST_URL,
      headers: { Accept: 'application/json' }
    })

    if (response.status !== 200) return null

    const latest = parseManifest(response.data)

    if (!latest || !Number.isFinite(installed) || latest.versionCode <= installed) return null

    return latest
  } catch {
    return null
  }
}

export function isUpdateDismissed(versionCode: number): boolean {
  return getItem<number>(DISMISSED_KEY) === versionCode
}

export function dismissUpdate(versionCode: number): void {
  setItem(DISMISSED_KEY, versionCode)
}
