const DEFAULT_MAX_ENTRIES = 4096

/**
 * Memoize a pure function on a string cache key.
 *
 * The cache is bounded and cleared wholesale when it fills up, which keeps
 * memory flat on long-lived PWA sessions without the bookkeeping cost of an
 * LRU. Intended for hot formatting/date helpers called once per list row.
 */
export function memoizeByKey<Args extends unknown[], Result>(
  compute: (...args: Args) => Result,
  buildKey: (...args: Args) => string,
  maxEntries = DEFAULT_MAX_ENTRIES
): ((...args: Args) => Result) & { clear: () => void } {
  const cache = new Map<string, Result>()

  const memoized = (...args: Args): Result => {
    const key = buildKey(...args)

    const cached = cache.get(key)

    if (cached !== undefined || cache.has(key)) return cached as Result

    const result = compute(...args)

    if (cache.size >= maxEntries) cache.clear()
    cache.set(key, result)

    return result
  }

  memoized.clear = () => cache.clear()

  return memoized
}
