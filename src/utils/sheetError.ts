import { showError } from './toast'
import { isAuthError } from '../services/auth'

type HandleSheetErrorOptions = {
  onReauth?: () => void
  fallbackMessage?: string
}

/** Handle sheet/API errors. Returns true when an auth error was handled. */
export function handleSheetError(err: unknown, options: HandleSheetErrorOptions = {}): boolean {
  const { onReauth, fallbackMessage = 'خطا در انجام عملیات' } = options

  if (isAuthError(err)) {
    onReauth?.()

    return true
  }

  const msg = err instanceof Error ? err.message : fallbackMessage

  showError(msg)

  return false
}
