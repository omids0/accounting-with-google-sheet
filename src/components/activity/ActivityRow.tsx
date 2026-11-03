import { activityMeta, activityText } from './activityText'
import RevertButton from './RevertButton'
import TrailChanges from './TrailChanges'
import type { TrailView } from './trailView'
import type { ActivityEntry } from '../../services/activityLog'
import type { SharingInfo } from '../../services/sharing'
import { calmRowClass, calmRowMainClass, calmRowSubClass } from '../ui/calmListStyles'
import { activityRowTextClass } from '../ui/writerStyles'
import WriterAvatar from '../WriterAvatar'

/** One feed line: avatar, «<name> <summary>», the «قبل ← بعد» lines, then «<when> · <device>». */
export default function ActivityRow({
  entry,
  info,
  nowMs,
  trail
}: {
  entry: ActivityEntry
  info: SharingInfo | null
  nowMs: number
  trail: TrailView
}) {
  return (
    <li className={calmRowClass}>
      <WriterAvatar email={entry.email} always />
      <span className={calmRowMainClass}>
        <span className={activityRowTextClass}>{activityText(entry, info)}</span>
        <TrailChanges lines={trail.lines(entry)} />
        <span className={calmRowSubClass}>{activityMeta(entry, nowMs)}</span>
        <RevertButton entry={entry} trail={trail} />
      </span>
    </li>
  )
}
