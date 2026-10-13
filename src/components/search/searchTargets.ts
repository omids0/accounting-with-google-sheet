import { getPathForTab, highlightPath, recordOpenPath } from '../../routes/paths'
import type { SearchEntry, SearchGroupId } from '../../services/globalSearch'
import type { AppIconName } from '../appIcon/types'
import type { Tab } from '../layout/types'

/** Module page each result group opens (records and vehicles have their own routes). */
const GROUP_TABS: Record<Exclude<SearchGroupId, 'records' | 'vehicles'>, Tab> = {
  counterparties: 'counterparties',
  checks: 'checks',
  receivables: 'receivables',
  dang: 'dang',
  installments: 'installments',
  treasury: 'treasury',
  reminders: 'personal-reminders'
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
  vehicles: 'car'
}

/** Where a result opens: its module page with the item highlighted (records: shown alone). */
export function searchEntryPath(entry: SearchEntry): string {
  if (entry.group === 'records') return recordOpenPath(entry.recordType ?? 'expense', entry.id)
  if (entry.group === 'vehicles') return getPathForTab('vehicle-detail', { vehicleId: entry.id })

  return highlightPath(getPathForTab(GROUP_TABS[entry.group]), entry.id)
}
