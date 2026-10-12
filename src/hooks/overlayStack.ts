/**
 * Open overlays (modals, sheets, drawer, speed dial) in the order they opened.
 * The Android back button and Escape close the top one before anything else.
 */
interface OverlayEntry {
  id: number
  /** Closes the overlay; returns false when it refused (e.g. while saving). */
  close: () => boolean
}

const stack: OverlayEntry[] = []

let nextId = 1

export function getOverlayCount(): number {
  return stack.length
}

/**
 * Asks the top overlay to close. Returns true when an overlay was on screen, even
 * if it refused, so the press is consumed instead of navigating underneath it.
 */
export function closeTopOverlay(): boolean {
  const top = stack[stack.length - 1]

  if (!top) return false
  top.close()

  return true
}

/**
 * The single Escape handler: closes only the top overlay. A field that handles
 * Escape itself (e.g. cancelling an inline edit) calls preventDefault to keep it.
 */
export function closeTopOverlayOnEscape(event: KeyboardEvent): boolean {
  if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing) return false
  if (!closeTopOverlay()) return false
  event.preventDefault()

  return true
}

// Listening only while something is open keeps every screen, including login
// and unlock, covered without mounting a hook in each app shell.
function setEscapeListener(active: boolean) {
  if (typeof document === 'undefined') return
  if (active) document.addEventListener('keydown', closeTopOverlayOnEscape)
  else document.removeEventListener('keydown', closeTopOverlayOnEscape)
}

export function pushOverlay(close: () => boolean): () => void {
  const entry = { id: nextId++, close }

  if (stack.length === 0) setEscapeListener(true)
  stack.push(entry)

  return () => {
    const index = stack.findIndex(item => item.id === entry.id)

    if (index < 0) return
    stack.splice(index, 1)
    if (stack.length === 0) setEscapeListener(false)
  }
}

export type BackAction = 'overlay' | 'back' | 'home' | 'confirm-exit' | 'exit'

export const EXIT_CONFIRM_WINDOW_MS = 2000

export function decideBackAction(input: {
  overlayOpen: boolean
  pathname: string
  canGoBack: boolean
  lastRootPressAt: number | null
  now: number
}): BackAction {
  if (input.overlayOpen) return 'overlay'
  if (input.pathname !== '/') return input.canGoBack ? 'back' : 'home'

  const pressedRecently =
    input.lastRootPressAt !== null && input.now - input.lastRootPressAt < EXIT_CONFIRM_WINDOW_MS

  return pressedRecently ? 'exit' : 'confirm-exit'
}
