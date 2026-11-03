const tails = new Map<string, Promise<void>>()

/**
 * Runs `task` after every earlier task of the same `key` has finished, so a read-modify-write
 * (a balance, a «آخرین ثبت») never overlaps another one on the same data. A task that throws
 * hands its error to its own caller only and releases the queue for the next one.
 */
export function runSerial<T>(key: string, task: () => Promise<T>): Promise<T> {
  const previous = tails.get(key) ?? Promise.resolve()
  const run = previous.then(task)
  const tail = run.then(
    () => undefined,
    () => undefined
  )

  tails.set(key, tail)
  void tail.then(() => {
    if (tails.get(key) === tail) tails.delete(key)
  })

  return run
}
