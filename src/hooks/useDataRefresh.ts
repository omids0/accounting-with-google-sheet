import { useDataRevision } from '../services/dataRevision'

/** Re-fetch list/dashboard data when spreadsheet content changes. */
export function useDataRefresh(): number {
  return useDataRevision()
}
