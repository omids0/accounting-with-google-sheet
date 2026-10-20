import { getDefaultSettings, getSettings, saveSettings } from './settings'
import type { SpreadsheetEntry } from '../types'

/**
 * «بایگانی ساختمان»: the `active` flag of the registration in `settings.spreadsheets`. The sheet
 * itself is untouched; an archived building leaves the home list (under «بایگانی‌شده»), the
 * dashboard nudge and the SMS routing until «بازگردانی».
 */
export const isArchivedEntry = (entry: Pick<SpreadsheetEntry, 'active'>): boolean =>
  entry.active === false

/** Flags the registered building; false when this device does not know the spreadsheet. */
export function setBuildingArchived(spreadsheetId: string, archived: boolean): boolean {
  const settings = getSettings() ?? getDefaultSettings()

  const known = settings.spreadsheets ?? []

  if (!known.some(entry => entry.id === spreadsheetId)) return false

  saveSettings({
    ...settings,
    spreadsheets: known.map(entry => {
      if (entry.id !== spreadsheetId) return entry

      if (archived) return { ...entry, active: false }

      const restored = { ...entry }

      delete restored.active

      return restored
    })
  })

  return true
}
