import type { TrailLine } from './trailText'
import type { ActivityEntry } from '../../services/activityLog'

/** What a feed row needs to show its trail and the «بازگردانی» button. */
export interface TrailView {
  lines: (entry: ActivityEntry) => TrailLine[]
  /** The button is shown. */
  offered: (entry: ActivityEntry) => boolean
  /** The row was reverted before: «بازگردانی شد» instead of the button. */
  reverted: (entry: ActivityEntry) => boolean
  revert: (entry: ActivityEntry) => void
}

/** The dashboard's feed shows summaries only: no «قبل ← بعد», no button. */
export const NO_TRAIL_VIEW: TrailView = {
  lines: () => [],
  offered: () => false,
  reverted: () => false,
  revert: () => undefined
}
