import { readWorkspaceCards } from './bankSmsRouting'
import { getSettings } from './settings'
import { isBuildingEntry } from './workspace'

/** A building that could not be read is tried again after this long, not on every sync. */
const RETRY_MS = 5 * 60_000

const lastTry = new Map<string, number>()

/**
 * A building this device has never opened has no cards in the routing cache yet (bankSmsRouting.ts),
 * so its SMS would show in the personal queue. Reading the building's tabs once puts its cards
 * there (the home card's summary does the same read, and writes the cache as it goes).
 */
export async function loadMissingBuildingCards(): Promise<void> {
  const settings = getSettings()
  const cached = readWorkspaceCards()

  const missing = (settings?.spreadsheets ?? []).filter(
    entry =>
      isBuildingEntry(entry) &&
      entry.id !== settings?.spreadsheetId &&
      !(entry.id in cached) &&
      Date.now() - (lastTry.get(entry.id) ?? 0) > RETRY_MS
  )

  if (!missing.length) return

  const { loadBuildingSummary } = await import('./buildingSummary')

  missing.forEach(entry => lastTry.set(entry.id, Date.now()))

  await Promise.all(missing.map(entry => loadBuildingSummary(entry.id).catch(() => null)))
}
