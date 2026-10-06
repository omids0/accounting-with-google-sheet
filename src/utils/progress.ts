/** Absorbs float noise such as 28.999999999999996 or an animation ending at 99.99999999. */
const PERCENT_EPSILON = 1e-6

/**
 * Whole percent for a progress label: rounded down and clamped to 0–100, so 99.5%
 * reads «۹۹٪» and «۱۰۰٪» only appears once the bar is actually full.
 */
export function floorPercent(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0

  return Math.min(100, Math.floor(value + PERCENT_EPSILON))
}

/** Paid/total progress: 100 only when `part` covers `whole`, never rounded up to it. */
export function progressPercent(part: number, whole: number): number {
  if (!(whole > 0) || !Number.isFinite(part)) return 0
  if (part >= whole) return 100

  return Math.min(99, floorPercent((part / whole) * 100))
}
