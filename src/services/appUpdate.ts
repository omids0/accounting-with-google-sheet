import { App } from '@capacitor/app'
import { CapacitorHttp } from '@capacitor/core'

import { isNativePlatform } from './googleAuthNative'
import { getItem, setItem } from './storage'
import { IS_DEV_BUILD } from '../utils/appEnv'

/** Published by the APK build workflow as a GitHub release asset. */
const VERSION_MANIFEST_URL =
  'https://github.com/omids0/accounting-with-google-sheet/releases/latest/download/version.json'

/** Same asset the manifest points at; the web build links it for first installs. */
export const APK_DOWNLOAD_URL =
  'https://github.com/omids0/accounting-with-google-sheet/releases/latest/download/hesab-ketab.apk'

const DISMISSED_KEY = 'accounting_update_dismissed'

/**
 * A newer version, from the APK release manifest or a waiting web service worker.
 * `webUpdate.ts` exposes the same `checkForUpdate` / `applyUpdate` / `status` as
 * this file, so the banner and the menu entry serve both platforms.
 */
export interface AvailableUpdate {
  /** «نسخه X»; empty when the web build could not read the new version. */
  versionName: string
  /** Identifies this update for «بعداً». */
  key: string
  /** APK only: the installer to download. */
  apkUrl?: string
}

let latest: AvailableUpdate | null = null

function parseManifest(data: unknown): (AvailableUpdate & { versionCode: number }) | null {
  const raw = typeof data === 'string' ? (JSON.parse(data) as unknown) : data

  if (!raw || typeof raw !== 'object') return null

  const { versionCode, versionName, apkUrl } = raw as Record<string, unknown>

  if (typeof versionCode !== 'number' || typeof apkUrl !== 'string') return null

  return {
    versionCode,
    versionName: typeof versionName === 'string' ? versionName : String(versionCode),
    key: String(versionCode),
    apkUrl
  }
}

/**
 * Resolves to null when up to date, offline, or running outside the APK. A dev build
 * never checks: the release manifest describes the production APK, not this one.
 */
export async function checkForUpdate(): Promise<AvailableUpdate | null> {
  if (IS_DEV_BUILD || !isNativePlatform()) return null

  try {
    const installed = Number((await App.getInfo()).build)

    // CapacitorHttp runs the request natively, so the WebView's origin rules don't apply.
    const response = await CapacitorHttp.get({
      url: VERSION_MANIFEST_URL,
      headers: { Accept: 'application/json' }
    })

    if (response.status !== 200) return null

    const manifest = parseManifest(response.data)

    if (!manifest || !Number.isFinite(installed) || manifest.versionCode <= installed) {
      latest = null
    } else {
      latest = { versionName: manifest.versionName, key: manifest.key, apkUrl: manifest.apkUrl }
    }

    return latest
  } catch {
    return null
  }
}

/** The installer downloads; Android then asks to install it over this version. */
export function applyUpdate(update: AvailableUpdate): void {
  if (update.apkUrl) window.open(update.apkUrl, '_blank')
}

export function status(): AvailableUpdate | null {
  return latest
}

export function dismissUpdate(key: string): void {
  setItem(DISMISSED_KEY, Number(key))
}

/** Null until the user postpones an update, so the menu can still surface it later. */
export function getDismissedKey(): string | null {
  const code = getItem<number>(DISMISSED_KEY)

  return code === null ? null : String(code)
}
