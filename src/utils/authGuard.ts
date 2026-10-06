import { hasStoredSession, isTokenValid } from '../services/auth'
import { getSettings } from '../services/settings'
import { requestReauth } from '../stores/appStore'

/**
 * A stored session is enough: writes go to the local mirror and the outbox
 * first, and API calls renew an expired token before they are sent.
 */
function hasUsableSession(): boolean {
  return isTokenValid() || hasStoredSession()
}

export function requireAuth(): boolean {
  if (!hasUsableSession()) {
    requestReauth()

    return false
  }

  return true
}

export function requireSpreadsheetId(): string | null {
  const settings = getSettings()

  if (!settings?.spreadsheetId || !hasUsableSession()) {
    requestReauth()

    return null
  }

  return settings.spreadsheetId
}
