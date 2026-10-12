import { create } from 'zustand'

import * as apkUpdate from '../services/appUpdate'
import type { AvailableUpdate } from '../services/appUpdate'
import { isNativePlatform } from '../services/googleAuthNative'
import * as webUpdate from '../services/webUpdate'

const RECHECK_THROTTLE_MS = 30 * 60_000

const native = isNativePlatform()

interface AppUpdateStore {
  update: AvailableUpdate | null
  /** «بعداً»: per launch on the web; the APK remembers the postponed build. */
  dismissedKey: string | null
  checking: boolean
  lastCheckedAt: number
  check: (options?: { force?: boolean }) => Promise<AvailableUpdate | null>
  apply: () => void
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
  apply: () => {
    const { update } = get()

    if (!update) return
    if (native) apkUpdate.applyUpdate(update)
    else void webUpdate.applyUpdate()
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
