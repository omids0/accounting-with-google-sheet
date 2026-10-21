import type { MenuLinkEntry } from './navMenuGroups'
import { activeBuildingEntries } from '../../services/buildingArchive'
import { getSpreadsheetLabel } from '../../services/spreadsheetCatalog'
import type { SpreadsheetEntry } from '../../types'

export const BUILDING_SWITCHER_LABEL = 'ساختمان‌های من'

/** The last switcher row: opens the «مدیر ساختمان» home (cards, new building, connect a sheet). */
export const BUILDING_ALL_LINK: MenuLinkEntry = {
  tab: 'buildings-home',
  icon: 'building',
  label: 'همهٔ ساختمان‌ها…'
}

/** More buildings than this and the list folds to the current one behind a toggle. */
export const SWITCHER_COLLAPSE_AFTER = 5

export interface BuildingSwitchRow {
  id: string
  /** The file label without the «حسابداری · » prefix, e.g. «ساختمان برج آبی». */
  label: string
  current: boolean
}

/**
 * The «ساختمان‌های من» rows of the building drawer: the registered, non-archived buildings of
 * `settings.spreadsheets` (the same list as the «مدیر ساختمان» home), the open one marked.
 */
export function buildingSwitchRows(
  entries: SpreadsheetEntry[],
  activeId: string
): BuildingSwitchRow[] {
  return activeBuildingEntries(entries).map(entry => ({
    id: entry.id,
    label: getSpreadsheetLabel(entry.name),
    current: entry.id === activeId
  }))
}

/** True when the list is long enough to fold. */
export const isSwitcherCollapsible = (rows: BuildingSwitchRow[]): boolean =>
  rows.length > SWITCHER_COLLAPSE_AFTER
