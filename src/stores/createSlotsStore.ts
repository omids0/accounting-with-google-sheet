import { create } from 'zustand'

import { placeQuickAction, type QuickActionId } from '../components/dashboard/quickActionCatalog'

export interface SlotsStore {
  ids: QuickActionId[]
  setSlot: (slot: number, id: QuickActionId) => void
  reset: () => void
}

/**
 * A per-device list of chosen destinations (Settings › «نمایش»): kept in localStorage under `key`
 * (not in `ACCOUNT_KEYS`, so a logout keeps it) and dropped from it while it equals the default.
 */
export function createSlotsStore(
  key: string,
  defaults: QuickActionId[],
  sanitize: (value: unknown) => QuickActionId[]
) {
  const read = (): QuickActionId[] => {
    try {
      const raw = localStorage.getItem(key)

      return raw ? sanitize(JSON.parse(raw)) : defaults
    } catch {
      return defaults
    }
  }

  const write = (ids: QuickActionId[]) => {
    try {
      if (ids.join() === defaults.join()) localStorage.removeItem(key)
      else localStorage.setItem(key, JSON.stringify(ids))
    } catch {
      // Private mode or full storage: the choice still holds for this launch.
    }
  }

  const useSlots = create<SlotsStore>((set, get) => ({
    ids: read(),
    setSlot: (slot, id) => {
      const ids = placeQuickAction(get().ids, slot, id)

      write(ids)
      set({ ids })
    },
    reset: () => {
      write(defaults)
      set({ ids: defaults })
    }
  }))

  return { read, useSlots }
}
