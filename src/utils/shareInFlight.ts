const pending = new Map<string, Promise<unknown>>()

/** Callers asking for the same `key` while it runs share one request instead of repeating it. */
export function shareInFlight<T>(key: string, task: () => Promise<T>): Promise<T> {
  const running = pending.get(key) as Promise<T> | undefined

  if (running) return running

  const next = task().finally(() => pending.delete(key))

  pending.set(key, next)

  return next
}
