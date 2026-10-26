/**
 * One action at a time, with a short quiet time after it. A double tap on a card's close button
 * must not run twice, and the second tap must not land on the NEXT card that slid under the finger
 * when the list shifted: while an action runs, and for `cooldownMs` after it, new ones are ignored.
 */
export function createRunGuard(cooldownMs: number, now: () => number = Date.now) {
  let busy = false
  let quietUntil = 0

  return {
    /** Runs `task`; `undefined` when another action is running or has just finished. */
    async run<T>(task: () => Promise<T>): Promise<T | undefined> {
      if (busy || now() < quietUntil) return undefined

      busy = true
      try {
        return await task()
      } finally {
        busy = false
        quietUntil = now() + cooldownMs
      }
    }
  }
}
