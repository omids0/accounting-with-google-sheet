import { useEffect } from 'react'

import { useBuildingAccess } from '../../hooks/useBuildingAccess'
import { useDataRevision } from '../../services/dataRevision'
import { getSettings } from '../../services/settings'

/** Lets the sync settle before the maintenance reads the receivables. */
const SETTLE_MS = 2500

/**
 * Inside a building workspace, after entering and after every sync: remove the unpaid duplicate
 * charges two devices may have issued and, for the manager, run the automatic monthly issue.
 * Mounted once by the layout; a role that cannot record does nothing.
 */
export function useBuildingChargeMaintenance(enabled: boolean): void {
  const revision = useDataRevision()
  const { can } = useBuildingAccess()

  const allowed = enabled && can('record')

  useEffect(() => {
    const spreadsheetId = getSettings()?.spreadsheetId

    if (!allowed || !spreadsheetId) return

    // Loaded on demand: the layout is in the main chunk, the charge services are not.
    const timer = setTimeout(
      () =>
        void import('../../services/buildingAutoIssue')
          .then(({ maintainCharges }) => maintainCharges(spreadsheetId))
          .catch(() => undefined),
      SETTLE_MS
    )

    return () => clearTimeout(timer)
  }, [allowed, revision])
}
