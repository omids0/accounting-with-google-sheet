import { showError } from './toast'
import { isAuthError } from '../services/auth'
import { requestReauth } from '../stores/appStore'

type HandleSheetErrorOptions = {
  fallbackMessage?: string
}

/** Handle sheet/API errors. Returns true when an auth error was handled. */
export function handleSheetError(err: unknown, options: HandleSheetErrorOptions = {}): boolean {
  const { fallbackMessage = 'خطا در انجام عملیات' } = options

  if (isAuthError(err)) {
    requestReauth()

    return true
  }

  const msg = err instanceof Error ? err.message : fallbackMessage

  showError(msg)

  return false
}
