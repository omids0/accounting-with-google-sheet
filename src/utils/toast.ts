import toast from 'react-hot-toast'

import { haptic } from './haptics'

/** Success toasts confirm saves, so they carry the light tap. */
export function showSuccess(message: string) {
  haptic('light')
  toast.success(message)
}

/**
 * Error toasts report failed saves and loads; `duration` (ms) keeps one up longer than usual. The
 * message is the toast's id, so the same error raised again while it is still up (a price refresh that
 * keeps failing) refreshes that toast instead of stacking a copy of it.
 */
export function showError(message: string, duration?: number) {
  haptic('error')
  toast.error(message, { id: `error:${message}`, ...(duration ? { duration } : {}) })
}

const SAVING_TOAST_ID = 'saving'

/** A neutral «در حال ذخیره…» while the sheet has not answered; `hideSaving` takes it away. */
export function showSaving(message = 'در حال ذخیره…') {
  toast.loading(message, { id: SAVING_TOAST_ID, duration: 6000 })
}

export function hideSaving() {
  // Removed at once, not faded: the final toast replaces it instead of stacking above it.
  toast.remove(SAVING_TOAST_ID)
}

export function showInfo(message: string, duration?: number) {
  toast(message, duration ? { duration } : undefined)
}
