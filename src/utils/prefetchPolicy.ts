/** The parts of the Network Information API that decide whether speculative loads are welcome. */
export interface ConnectionHints {
  saveData?: boolean
  effectiveType?: string
}

const SLOW_CONNECTION_TYPES = new Set(['2g', 'slow-2g'])

/** Speculative prefetch only when the user has not asked to save data and the link is not 2G. */
export function shouldPrefetch(connection: ConnectionHints | undefined): boolean {
  if (!connection) return true
  if (connection.saveData === true) return false

  return !SLOW_CONNECTION_TYPES.has(connection.effectiveType ?? '')
}

export function canPrefetchOnThisConnection(): boolean {
  if (typeof navigator === 'undefined') return false

  return shouldPrefetch((navigator as Navigator & { connection?: ConnectionHints }).connection)
}
