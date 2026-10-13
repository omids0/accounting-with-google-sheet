import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { useDataRefresh } from '../../hooks/useDataRefresh'
import { useSharing } from '../../hooks/useSharing'
import { SETTINGS_ACTIVITY_PATH } from '../../routes/paths'
import { fetchActivityLog, type ActivityEntry } from '../../services/activityLog'
import { getSettings } from '../../services/settings'
import ActivityList from '../activity/ActivityList'
import CalmBlock from '../CalmBlock'

export const DASHBOARD_ACTIVITY_LIMIT = 3

/** «فعالیت اخیر» under «تراکنش‌های اخیر»; only on a spreadsheet more than one account edits. */
export default function DashboardActivityBlock({ className }: { className?: string }) {
  const { shared, info } = useSharing()
  const navigate = useNavigate()
  const revision = useDataRefresh()
  const [entries, setEntries] = useState<ActivityEntry[]>([])

  useEffect(() => {
    const spreadsheetId = getSettings()?.spreadsheetId

    if (!shared || !spreadsheetId) return

    let live = true

    void fetchActivityLog(spreadsheetId, DASHBOARD_ACTIVITY_LIMIT, 0).then(
      list => live && setEntries(list)
    )

    return () => {
      live = false
    }
  }, [revision, shared])

  if (!shared || !entries.length) return null

  return (
    <CalmBlock
      className={className}
      title="فعالیت اخیر"
      action={{ label: 'همه ←', onClick: () => navigate(SETTINGS_ACTIVITY_PATH) }}
    >
      <ActivityList entries={entries} info={info} />
    </CalmBlock>
  )
}
