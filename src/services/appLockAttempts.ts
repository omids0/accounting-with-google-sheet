import { getItem, removeItem, setItem } from './storage'

export const UNLOCK_ATTEMPTS_KEY = 'accounting_app_lock_attempts'

/** Wrong PINs allowed before the first lockout. */
export const FREE_UNLOCK_ATTEMPTS = 5

/** Lockout after the 5th, 6th, 7th and every later wrong PIN. */
export const UNLOCK_LOCKOUT_STEPS_MS = [30_000, 60_000, 5 * 60_000, 15 * 60_000] as const

const MAX_LOCKOUT_MS = UNLOCK_LOCKOUT_STEPS_MS[UNLOCK_LOCKOUT_STEPS_MS.length - 1]

interface UnlockAttemptState {
  failures: number
  lockedUntil: number
}

function readState(): UnlockAttemptState {
  const stored = getItem<Partial<UnlockAttemptState>>(UNLOCK_ATTEMPTS_KEY)

  return {
    failures: Math.max(0, Number(stored?.failures) || 0),
    lockedUntil: Math.max(0, Number(stored?.lockedUntil) || 0)
  }
}

/**
 * Milliseconds until another PIN may be tried. Capped at the longest step so a
 * clock moved backwards cannot stretch a lockout indefinitely.
 */
export function getUnlockLockoutRemainingMs(now = Date.now()): number {
  const remaining = readState().lockedUntil - now

  return remaining > 0 ? Math.min(remaining, MAX_LOCKOUT_MS) : 0
}

/** Wrong PINs left before the next lockout starts. */
export function getRemainingUnlockAttempts(): number {
  return Math.max(0, FREE_UNLOCK_ATTEMPTS - readState().failures)
}

/** Records a wrong PIN and returns the lockout it triggered (0 when none). */
export function recordFailedUnlock(now = Date.now()): number {
  const failures = readState().failures + 1

  const step = failures - FREE_UNLOCK_ATTEMPTS

  const lockoutMs =
    step >= 0 ? UNLOCK_LOCKOUT_STEPS_MS[Math.min(step, UNLOCK_LOCKOUT_STEPS_MS.length - 1)] : 0

  setItem(UNLOCK_ATTEMPTS_KEY, {
    failures,
    lockedUntil: lockoutMs ? now + lockoutMs : 0
  })

  return lockoutMs
}

export function resetUnlockAttempts(): void {
  removeItem(UNLOCK_ATTEMPTS_KEY)
}
