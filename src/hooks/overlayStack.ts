/**
 * Open overlays (modals, sheets, drawer, speed dial) in the order they opened.
 * The Android back button closes the top one before it navigates anywhere.
 */
interface OverlayEntry {
  id: number
  /** Closes the overlay; returns false when it refused (e.g. while saving). */
  close: () => boolean
}

const stack: OverlayEntry[] = []

let nextId = 1

export function pushOverlay(close: () => boolean): () => void {
  const entry = { id: nextId++, close }

  stack.push(entry)

  return () => {
    const index = stack.findIndex(item => item.id === entry.id)

    if (index >= 0) stack.splice(index, 1)
  }
}

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
