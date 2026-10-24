import toast from 'react-hot-toast'

import { haptic } from './haptics'

/** Success toasts confirm saves, so they carry the light tap. */
export function showSuccess(message: string) {
  haptic('light')
  toast.success(message)
}

/** Error toasts report failed saves and loads. */
export function showError(message: string) {
  haptic('error')
  toast.error(message)
}

const SAVING_TOAST_ID = 'saving'

/** A neutral «در حال ذخیره…» while the sheet has not answered; `hideSaving` takes it away. */
export function showSaving(message = 'در حال ذخیره…') {
  toast.loading(message, { id: SAVING_TOAST_ID, duration: 6000 })
}

export function hideSaving() {
  toast.dismiss(SAVING_TOAST_ID)
}

export function showInfo(message: string) {
  toast(message)
}
