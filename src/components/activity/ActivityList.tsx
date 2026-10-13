import ActivityRow from './ActivityRow'
import type { ActivityEntry } from '../../services/activityLog'
import type { SharingInfo } from '../../services/sharing'
import { calmListClass } from '../ui/calmListStyles'

export default function ActivityList({
  entries,
  info
}: {
  entries: ActivityEntry[]
  info: SharingInfo | null
}) {
  const nowMs = Date.now()

  return (
    <ul className={calmListClass}>
      {entries.map(entry => (
        <ActivityRow key={entry.id} entry={entry} info={info} nowMs={nowMs} />
      ))}
    </ul>
  )
}
