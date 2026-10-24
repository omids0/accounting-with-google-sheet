/** Wait for the failed submit to paint its inline errors before looking for them. */
const ERRORS_PAINT_DELAY_MS = 80

/**
 * After a failed submit, move the focus to the first field marked `aria-invalid="true"` inside
 * `root` and scroll it into view, so a field below the fold or behind the keyboard is not missed.
 * Does nothing when the submit went through (no field is marked invalid).
 */
export function focusFirstInvalidField(root: ParentNode | null | undefined): void {
  if (!root || typeof window === 'undefined') return

  window.setTimeout(() => {
    const target = root.querySelector<HTMLElement>('[aria-invalid="true"]:not([disabled])')

    if (!target) return

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    target.focus({ preventScroll: true })
    target.scrollIntoView?.({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' })
  }, ERRORS_PAINT_DELAY_MS)
}
