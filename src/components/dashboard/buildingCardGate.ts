import { isArchivedEntry } from '../../services/buildingArchive'
import { getSpreadsheets } from '../../services/settings'
import { getActiveWorkspaceType, isBuildingEntry } from '../../services/workspace'
import type { SpreadsheetEntry } from '../../types'
import { getJalaliParts } from '../../utils/jalaliDate'

/** The card starts on this day of the Jalali month: earlier there is nothing worth a nudge yet. */
export const BUILDING_CARD_FROM_DAY = 10

/**
 * The buildings the personal dashboard may nudge about, cheap to ask on every dashboard visit: none
 * in a building workspace, none before the 10th of the month, none without a registered building.
 * The summaries behind the card load only when this is not empty.
 */
export function buildingCardCandidates(date = new Date()): SpreadsheetEntry[] {
  if (getActiveWorkspaceType() !== 'personal') return []
  if (getJalaliParts(date).day < BUILDING_CARD_FROM_DAY) return []

  return getSpreadsheets().filter(entry => isBuildingEntry(entry) && !isArchivedEntry(entry))
}
