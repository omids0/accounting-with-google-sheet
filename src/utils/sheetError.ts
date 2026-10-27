import { showError } from './toast'
import { toUserMessage } from './userMessage'
import { isAuthError } from '../services/auth'
import { requestReauth } from '../stores/appStore'

type HandleSheetErrorOptions = {
  fallbackMessage?: string
  /** How long (ms) the message stays, for one the user must not miss. */
  duration?: number
}

/** Handle sheet/API errors. Returns true when an auth error was handled. */
export function handleSheetError(err: unknown, options: HandleSheetErrorOptions = {}): boolean {
  const { fallbackMessage = 'خطا در انجام عملیات', duration } = options

  if (isAuthError(err)) {
    requestReauth()

    return true
  }

  const message = toUserMessage(err, fallbackMessage)

  if (duration) showError(message, duration)
  else showError(message)

  return false
}
