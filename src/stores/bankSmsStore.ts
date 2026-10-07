import { create } from 'zustand'

import {
  getBankSmsPermission,
  getPendingBankSms,
  isBankSmsAvailable,
  scanBankSmsInbox,
  type BankSmsItem
} from '../services/bankSmsNative'
import { getBankSmsPrefs, updateBankSmsPrefs } from '../services/bankSmsPrefs'

interface BankSmsStore {
  pending: BankSmsItem[]
  loading: boolean
  /** Catch up on missed SMS from the inbox, then reload the native queue. */
  refresh: () => Promise<void>
  /** Scan the inbox from an earlier point (old SMS after a new template). */
  scanFrom: (sinceMs: number) => Promise<number>
}

let inFlight: Promise<void> | null = null

/** A refresh requested while one runs: one more pass after it, shared by all callers. */
let followUp: Promise<void> | null = null

async function loadPending(): Promise<BankSmsItem[]> {
  const prefs = getBankSmsPrefs()

  if (!prefs.enabled || !isBankSmsAvailable()) return []

  if ((await getBankSmsPermission()) === 'granted') {
    const { scannedAt } = await scanBankSmsInbox(prefs.lastScanAt)

    updateBankSmsPrefs({ lastScanAt: scannedAt })
  }

  return getPendingBankSms()
}

export const useBankSmsStore = create<BankSmsStore>((set, get) => ({
  pending: [],
  loading: false,
  refresh: () => {
    // The running pass may have read the queue before the caller's change.
    if (inFlight) {
      followUp ??= inFlight.then(() => {
        followUp = null

        return get().refresh()
      })

      return followUp
    }

    set({ loading: true })
    inFlight = loadPending()
      .then(pending => set({ pending }))
      .catch(() => {
        // Keep the last known queue; the next resume retries.
      })
      .finally(() => {
        inFlight = null
        set({ loading: false })
      })

    return inFlight
  },
  scanFrom: async sinceMs => {
    const { added } = await scanBankSmsInbox(sinceMs)

    await get().refresh()

    return added
  }
}))
