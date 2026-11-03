/**
 * The timer behind an undo toast. It stops while the user hovers, focuses or presses the toast
 * (WCAG 2.2.1: a time limit the user can pause) and carries on with the time that was left.
 * The toast and the timer meet through the toast id.
 */
interface UndoWindowState {
  remaining: number
  startedAt: number
  timer: ReturnType<typeof setTimeout> | null
  onElapsed: () => void
}

const windows = new Map<string, UndoWindowState>()

function run(id: string, win: UndoWindowState) {
  win.startedAt = Date.now()
  win.timer = setTimeout(() => {
    windows.delete(id)
    win.onElapsed()
  }, win.remaining)
}

/** Calls `onElapsed` after `ms`, unless held. Returns a cancel function. */
export function startUndoWindow(id: string, ms: number, onElapsed: () => void): () => void {
  const win: UndoWindowState = { remaining: ms, startedAt: 0, timer: null, onElapsed }

  windows.set(id, win)
  run(id, win)

  return () => {
    if (win.timer) clearTimeout(win.timer)
    if (windows.get(id) === win) windows.delete(id)
  }
}

/** Pauses (`true`) or resumes (`false`) the window of a toast; no-op once it has ended. */
export function holdUndoWindow(id: string, held: boolean): void {
  const win = windows.get(id)

  if (!win) return

  if (held && win.timer) {
    clearTimeout(win.timer)
    win.timer = null
    win.remaining = Math.max(0, win.remaining - (Date.now() - win.startedAt))
  } else if (!held && !win.timer) {
    run(id, win)
  }
}
