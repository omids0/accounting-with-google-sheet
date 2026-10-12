/**
 * Horizontal swipe on a list card (round 6, bank SMS queue). Pure helpers so the
 * thresholds are testable; `useSwipeActions` wires them to touch events.
 */

/** Movement before the gesture picks an axis; below it a tap stays a tap. */
export const SWIPE_SLOP_PX = 10

/** A swipe acts once it travels this far, or `SWIPE_WIDTH_RATIO` of the card. */
export const SWIPE_MIN_PX = 80

export const SWIPE_WIDTH_RATIO = 0.35

export type SwipeAxis = 'x' | 'y'

export type SwipeDirection = 'right' | 'left'

/**
 * `null` until the finger left the slop; then `x` only for a clearly sideways move,
 * so a slightly diagonal scroll stays a scroll.
 */
export function lockSwipeAxis(dx: number, dy: number, slop = SWIPE_SLOP_PX): SwipeAxis | null {
  const ax = Math.abs(dx)
  const ay = Math.abs(dy)

  if (Math.max(ax, ay) < slop) return null

  return ax > ay * 1.5 ? 'x' : 'y'
}

export function swipeThreshold(width: number): number {
  return Math.max(SWIPE_MIN_PX, width * SWIPE_WIDTH_RATIO)
}

/** Screen direction of a drag (`dx` > 0 = right, also in RTL). */
export function swipeDirection(dx: number): SwipeDirection | null {
  return dx > 0 ? 'right' : dx < 0 ? 'left' : null
}

/** How far the card follows the finger: 0 toward a side without an action. */
export function swipeOffset(dx: number, allowed: Record<SwipeDirection, boolean>): number {
  const direction = swipeDirection(dx)

  return direction && allowed[direction] ? dx : 0
}

/** The action a released drag triggers, or `null` when it stayed short of the threshold. */
export function swipeOutcome(
  dx: number,
  width: number,
  allowed: Record<SwipeDirection, boolean>
): SwipeDirection | null {
  const direction = swipeDirection(swipeOffset(dx, allowed))

  return direction && Math.abs(dx) >= swipeThreshold(width) ? direction : null
}
