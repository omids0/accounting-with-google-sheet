import ActivityRow from './ActivityRow'
import { NO_TRAIL_VIEW, type TrailView } from './trailView'
import type { ActivityEntry } from '../../services/activityLog'
import type { SharingInfo } from '../../services/sharing'
import { calmListClass } from '../ui/calmListStyles'

export default function ActivityList({
  entries,
  info,
  trail = NO_TRAIL_VIEW
}: {
  entries: ActivityEntry[]
  info: SharingInfo | null
  trail?: TrailView
}) {
  const nowMs = Date.now()

  return (
    <ul className={calmListClass}>
      {entries.map(entry => (
        <ActivityRow key={entry.id} entry={entry} info={info} nowMs={nowMs} trail={trail} />
      ))}
    </ul>
  )
}
