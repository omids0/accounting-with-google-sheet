import { isTokenValid } from '../services/auth'
import { getSettings } from '../services/settings'
import { requestReauth } from '../stores/appStore'

export function requireAuth(): boolean {
  if (!isTokenValid()) {
    requestReauth()

    return false
  }

  return true
}

export function requireSpreadsheetId(): string | null {
  const settings = getSettings()

  if (!settings?.spreadsheetId || !isTokenValid()) {
    requestReauth()

    return null
  }

  return settings.spreadsheetId
}
