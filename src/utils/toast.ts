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

export function showInfo(message: string) {
  toast(message)
}
