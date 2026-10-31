import type { TrailView } from './trailView'
import type { ActivityEntry } from '../../services/activityLog'
import Button from '../ui/Button'

/** «بازگردانی» (44px tall), or «بازگردانی شد» once the row has been reverted. */
export default function RevertButton({ entry, trail }: { entry: ActivityEntry; trail: TrailView }) {
  if (trail.reverted(entry))
    return <span className="mt-1 block text-[0.72rem] text-muted">بازگردانی شد</span>
  if (!trail.offered(entry)) return null

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className="mt-2 min-h-touch-min min-w-touch-min"
      onClick={() => trail.revert(entry)}
    >
      بازگردانی
    </Button>
  )
}
