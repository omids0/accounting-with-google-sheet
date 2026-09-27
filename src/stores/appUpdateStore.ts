import { create } from 'zustand'

import {
  type AvailableUpdate,
  checkForUpdate,
  dismissUpdate,
  getDismissedVersionCode
} from '../services/appUpdate'

const RECHECK_THROTTLE_MS = 30 * 60_000

interface AppUpdateStore {
  update: AvailableUpdate | null
  dismissedCode: number | null
  checking: boolean
  lastCheckedAt: number
  check: (options?: { force?: boolean }) => Promise<AvailableUpdate | null>
  dismiss: () => void
}

/**
 * Shared so the banner, the menu entry and the header dot all read one check
 * instead of each firing its own request.
 */
export const useAppUpdateStore = create<AppUpdateStore>((set, get) => ({
  update: null,
  dismissedCode: getDismissedVersionCode(),
  checking: false,
  lastCheckedAt: 0,
  check: async ({ force = false } = {}) => {
    const { checking, lastCheckedAt, update } = get()

    if (checking) return update
    if (!force && Date.now() - lastCheckedAt < RECHECK_THROTTLE_MS) return update

    set({ checking: true })
    try {
      const latest = await checkForUpdate()

      set({ update: latest, lastCheckedAt: Date.now() })

      return latest
    } finally {
      set({ checking: false })
    }
  },
  dismiss: () => {
    const { update } = get()

    if (!update) return
    dismissUpdate(update.versionCode)
    set({ dismissedCode: update.versionCode })
  }
}))

/** The banner hides once postponed; the menu entry keeps the update reachable. */
export function selectBannerUpdate(state: AppUpdateStore): AvailableUpdate | null {
  return state.update && state.update.versionCode !== state.dismissedCode ? state.update : null
}
