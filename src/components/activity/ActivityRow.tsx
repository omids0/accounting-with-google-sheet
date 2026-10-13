import { activityMeta, activityText } from './activityText'
import type { ActivityEntry } from '../../services/activityLog'
import type { SharingInfo } from '../../services/sharing'
import { calmRowClass, calmRowMainClass, calmRowSubClass } from '../ui/calmListStyles'
import { activityRowTextClass } from '../ui/writerStyles'
import WriterAvatar from '../WriterAvatar'

/** One feed line: avatar, «<name> <summary>», then «<when> · <device>». */
export default function ActivityRow({
  entry,
  info,
  nowMs
}: {
  entry: ActivityEntry
  info: SharingInfo | null
  nowMs: number
}) {
  return (
    <li className={calmRowClass}>
      <WriterAvatar email={entry.email} always />
      <span className={calmRowMainClass}>
        <span className={activityRowTextClass}>{activityText(entry, info)}</span>
        <span className={calmRowSubClass}>{activityMeta(entry, nowMs)}</span>
      </span>
    </li>
  )
}
