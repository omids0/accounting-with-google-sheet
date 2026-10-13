import { create } from 'zustand'

import { getItem, removeItem, setItem } from '../services/storage'

/**
 * Per device on purpose (privacy in company, like the screen of this phone):
 * not tied to a spreadsheet and not in `ACCOUNT_KEYS`, so signing out or
 * switching sheets keeps it until the user turns it off.
 */
export const AMOUNTS_HIDDEN_KEY = 'accounting_amounts_hidden'

export function readAmountsHidden(): boolean {
  return getItem<boolean>(AMOUNTS_HIDDEN_KEY) === true
}

export function writeAmountsHidden(hidden: boolean): void {
  try {
    if (hidden) setItem(AMOUNTS_HIDDEN_KEY, true)
    else removeItem(AMOUNTS_HIDDEN_KEY)
  } catch {
    // Private mode or full storage: the switch still works for this launch.
  }
}

interface AmountsHiddenStore {
  hidden: boolean
  setHidden: (hidden: boolean) => void
  toggle: () => void
}

export const useAmountsHiddenStore = create<AmountsHiddenStore>((set, get) => ({
  hidden: readAmountsHidden(),
  setHidden: hidden => {
    writeAmountsHidden(hidden)
    set({ hidden })
  },
  toggle: () => get().setHidden(!get().hidden)
}))
