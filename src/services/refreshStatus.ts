/**
 * `ok`: a new token is stored. `denied`: Google (or the worker) refused, so only the
 * user can fix it. `transient`: nothing answered (offline, script or network error),
 * so the session may well be fine and must not be called expired.
 */
export type RefreshOutcome = 'ok' | 'denied' | 'transient'

/** This many transient results in a row make the «نشست تمدید نشد» notice appear. */
export const STALLED_AFTER_TRANSIENTS = 3

let lastOutcome: RefreshOutcome = 'ok'

let transientStreak = 0

/** When an unbroken run of transient results began while the browser was online. */
let transientOnlineSince: number | null = null

const listeners = new Set<() => void>()

export function recordRefreshOutcome(outcome: RefreshOutcome): void {
  lastOutcome = outcome

  if (outcome === 'transient') {
    transientStreak += 1
    // Offline time does not count towards giving up: nothing could have worked.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      transientOnlineSince = null
    } else {
      transientOnlineSince ??= Date.now()
    }
  } else {
    transientStreak = 0
    transientOnlineSince = null
  }
  listeners.forEach(listener => listener())
}

/** A fresh sign-in starts clean. */
export function resetRefreshStatus(): void {
  recordRefreshOutcome('ok')
}

/** True when the last renewal failed only because nothing answered (offline). */
export function lastRefreshWasTransient(): boolean {
  return lastOutcome === 'transient'
}

export function getTransientStreak(): number {
  return transientStreak
}

/** How long renewals have kept failing without an answer while the browser was online. */
export function transientOnlineForMs(): number {
  return transientOnlineSince === null ? 0 : Date.now() - transientOnlineSince
}

export function isRefreshStalled(): boolean {
  return transientStreak >= STALLED_AFTER_TRANSIENTS
}

export function subscribeRefreshStatus(listener: () => void): () => void {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}
