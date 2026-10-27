import { useEffect } from 'react'

import { useDataRevision } from '../../services/dataRevision'
import { getSettings } from '../../services/settings'

/** Lets the sync settle before the member rows are read. */
const SETTLE_MS = 2500

/**
 * Inside a building or the shared account, after entering and after every sync: the signed-in
 * member who was invited removes their own invite marker, so «دعوت‌شده» becomes «فعال» for
 * everyone. Mounted once by the layout (`enabled` = not the personal sheet); the member service
 * decides, by the sheet's kind, whether this user may and needs to write.
 */
export function useClaimInvite(enabled: boolean): void {
  const revision = useDataRevision()

  useEffect(() => {
    const spreadsheetId = getSettings()?.spreadsheetId

    if (!enabled || !spreadsheetId) return

    const timer = setTimeout(
      () =>
        void import('../../services/buildingMembers')
          .then(({ claimOwnInvite }) => claimOwnInvite(spreadsheetId))
          .catch(() => undefined),
      SETTLE_MS
    )

    return () => clearTimeout(timer)
  }, [enabled, revision])
}
