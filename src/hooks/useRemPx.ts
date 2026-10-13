import { useDisplayPrefsStore } from '../stores/displayPrefsStore'
import { remToPx } from '../utils/displayPrefs'

/**
 * `rem` in pixels for layouts measured in JS (wheel rows, scroll offsets), so
 * they grow with «اندازهٔ متن» like the CSS around them.
 */
export function useRemPx(rem: number): number {
  const textSize = useDisplayPrefsStore(state => state.textSize)

  return remToPx(rem, textSize)
}
