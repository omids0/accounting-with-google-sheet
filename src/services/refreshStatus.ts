/**
 * `ok`: a new token is stored. `denied`: Google (or the worker) refused, so only the
 * user can fix it. `transient`: nothing answered (offline, script or network error),
 * so the session may well be fine and must not be called expired.
 */
export type RefreshOutcome = 'ok' | 'denied' | 'transient'

/** This many backed-off attempts in a row without an answer make the «نشست تمدید نشد» notice appear. */
export const STALLED_AFTER_TRANSIENTS = 3

/**
 * Backed-off attempts are at most five minutes apart (plus the time one takes). A longer
 * gap between two of them means the computer slept or the page was frozen, not that
 * Google has been silent all that time.
 */
export const SLEEP_GAP_MS = 6 * 60_000

let lastOutcome: RefreshOutcome = 'ok'

/** Attempts the refresh timer made in a row that got no answer; drives the pauses and the notice. */
let backoffStreak = 0

/** Awake time covered by that run of attempts while online. */
let awakeTransientMs = 0

let lastBackoffAt: number | null = null

const listeners = new Set<() => void>()

const notify = () => listeners.forEach(listener => listener())

export function recordRefreshOutcome(outcome: RefreshOutcome): void {
  lastOutcome = outcome

  if (outcome !== 'transient') {
    backoffStreak = 0
    awakeTransientMs = 0
    lastBackoffAt = null
  }
  notify()
}

/**
 * Called by the refresh timer after one of its own attempts got no answer. Other callers
 * (an API call, the `online` handler of a page) do not count, so a burst of requests
 * cannot push the pauses to five minutes or raise the notice by itself.
 */
export function noteBackoffAttempt(): void {
  const now = Date.now()

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    // Offline time says nothing about the session.
    awakeTransientMs = 0
    lastBackoffAt = null
  } else if (lastBackoffAt !== null && now - lastBackoffAt > SLEEP_GAP_MS) {
    // Woke up from sleep: start counting again, and start the pauses again too.
    awakeTransientMs = 0
    backoffStreak = 0
    lastBackoffAt = now
  } else {
    awakeTransientMs += lastBackoffAt === null ? 0 : now - lastBackoffAt
    lastBackoffAt = now
  }
  backoffStreak += 1
  notify()
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
  return backoffStreak
}

/** Awake, online time that renewals have kept getting no answer. */
export function transientOnlineForMs(): number {
  return awakeTransientMs
}

export function isRefreshStalled(): boolean {
  return backoffStreak >= STALLED_AFTER_TRANSIENTS
}

export function subscribeRefreshStatus(listener: () => void): () => void {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}
