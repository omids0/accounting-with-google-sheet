import { create } from 'zustand'

/** Long enough for the camera → entry form hop; a photo nobody picked up must not linger. */
const EXPIRES_MS = 30_000

interface PendingInvoiceScan {
  /** The photo the dashboard shortcut took, waiting for the entry form to scan it. */
  file: File | null
  hold: (file: File) => void
  clear: () => void
}

let expiry: ReturnType<typeof setTimeout> | undefined

/**
 * One-shot hand-off from the dashboard's «اسکن فاکتور» shortcut to the entry form's «ریز اقلام»
 * field. In memory only (never router state, which a reload or back would replay).
 */
export const usePendingInvoiceScan = create<PendingInvoiceScan>(setState => ({
  file: null,
  hold: file => {
    clearTimeout(expiry)
    expiry = setTimeout(() => setState({ file: null }), EXPIRES_MS)
    setState({ file })
  },
  clear: () => {
    clearTimeout(expiry)
    setState({ file: null })
  }
}))
