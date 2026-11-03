import { create } from 'zustand'

import * as apkUpdate from '../services/appUpdate'
import { UPDATE_BACKUP_FAILED_MESSAGE, type AvailableUpdate } from '../services/appUpdate'
import { isNativePlatform } from '../services/googleAuthNative'
import * as webUpdate from '../services/webUpdate'
import { showInfo } from '../utils/toast'

const RECHECK_THROTTLE_MS = 30 * 60_000

const native = isNativePlatform()

interface AppUpdateStore {
  update: AvailableUpdate | null
  /** «بعداً»: per launch on the web; the APK remembers the postponed build. */
  dismissedKey: string | null
  checking: boolean
  /** «در حال گرفتن پشتیبان…»: the backup before the update is running; a second press is ignored. */
  preparing: boolean
  /** APK: the installer link was refused after the backup; the next tap («باز کردن لینک نصب») opens it. */
  installBlocked: boolean
  lastCheckedAt: number
  check: (options?: { force?: boolean }) => Promise<AvailableUpdate | null>
  apply: () => Promise<void>
  dismiss: () => void
}

/**
 * Shared so the banner, the menu entry and the header dot all read one check
 * instead of each firing its own request. The APK asks its release manifest; the
 * web build follows its waiting service worker (`webUpdate.ts`).
 */
export const useAppUpdateStore = create<AppUpdateStore>((set, get) => ({
  update: null,
  dismissedKey: native ? apkUpdate.getDismissedKey() : null,
  checking: false,
  preparing: false,
  installBlocked: false,
  lastCheckedAt: 0,
  check: async ({ force = false } = {}) => {
    const { checking, lastCheckedAt, update } = get()

    if (checking) return update
    if (!force && Date.now() - lastCheckedAt < RECHECK_THROTTLE_MS) return update

    set({ checking: true })
    try {
      const latest = await (native ? apkUpdate.checkForUpdate() : webUpdate.checkForUpdate())

      set({ update: latest, lastCheckedAt: Date.now() })

      return latest
    } finally {
      set({ checking: false })
    }
  },
  apply: async () => {
    const { update, preparing, installBlocked } = get()

    if (!update || preparing) return
    if (installBlocked) {
      // The backup is done; this tap is itself the gesture that lets the link open.
      if (apkUpdate.applyUpdate(update)) set({ installBlocked: false })

      return
    }

    set({ preparing: true })
    try {
      // Loaded on demand: the backup code stays out of the main chunk until someone updates.
      const { backupBeforeUpdate } = await import('../services/updateBackup')

      await backupBeforeUpdate(update.versionName || undefined)
    } catch {
      // The backup never blocks the update.
      showInfo(UPDATE_BACKUP_FAILED_MESSAGE)
    } finally {
      set({ preparing: false })
    }

    if (!native) await webUpdate.applyUpdate()
    else if (!apkUpdate.applyUpdate(update)) set({ installBlocked: true })
  },
  dismiss: () => {
    const { update } = get()

    if (!update) return
    if (native) apkUpdate.dismissUpdate(update.key)
    set({ dismissedKey: update.key })
  }
}))

if (!native) webUpdate.subscribeWebUpdate(update => useAppUpdateStore.setState({ update }))

/** The banner hides once postponed; the menu entry keeps the update reachable. */
export function selectBannerUpdate(state: AppUpdateStore): AvailableUpdate | null {
  return state.update && state.update.key !== state.dismissedKey ? state.update : null
}
