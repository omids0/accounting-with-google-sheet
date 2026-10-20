import { getPathForTab, highlightPath, recordOpenPath } from '../../routes/paths'
import type { SearchEntry, SearchGroupId } from '../../services/globalSearch'
import { getActiveWorkspaceType } from '../../services/workspace'
import type { AppIconName } from '../appIcon/types'
import type { Tab } from '../layout/types'

/** Module page each result group opens (records and vehicles have their own routes). */
const GROUP_TABS: Record<
  Exclude<SearchGroupId, 'records' | 'vehicles' | 'units' | 'residents'>,
  Tab
> = {
  counterparties: 'counterparties',
  checks: 'checks',
  receivables: 'receivables',
  dang: 'dang',
  installments: 'installments',
  treasury: 'treasury',
  reminders: 'personal-reminders'
}

/** The same groups inside a building, whose pages replace the personal ones. */
const BUILDING_GROUP_TABS: Partial<Record<SearchGroupId, Tab>> = {
  counterparties: 'building-counterparties',
  checks: 'building-checks',
  receivables: 'building-charges',
  dang: 'building-dang'
}

export const SEARCH_GROUP_ICONS: Record<SearchGroupId, AppIconName> = {
  counterparties: 'counterparties',
  records: 'records',
  checks: 'checks',
  receivables: 'receivables',
  dang: 'debt',
  installments: 'installments',
  treasury: 'treasury',
  reminders: 'bell',
  vehicles: 'car',
  units: 'door',
  residents: 'counterparties'
}

/** Where a result opens: its module page with the item highlighted (records: shown alone). */
export function searchEntryPath(entry: SearchEntry): string {
  if (entry.group === 'records') return recordOpenPath(entry.recordType ?? 'expense', entry.id)
  if (entry.group === 'vehicles') return getPathForTab('vehicle-detail', { vehicleId: entry.id })
  if (entry.group === 'units' || entry.group === 'residents') {
    return getPathForTab('building-unit', { unitId: entry.unitId ?? entry.id })
  }

  const building = getActiveWorkspaceType() === 'building' ? BUILDING_GROUP_TABS[entry.group] : null

  return building
    ? highlightPath(getPathForTab(building), entry.id)
    : highlightPath(getPathForTab(GROUP_TABS[entry.group]), entry.id)
}
