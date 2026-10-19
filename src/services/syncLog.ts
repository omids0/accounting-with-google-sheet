import { getItem, removeItem, setItem } from './storage'

/**
 * A small rolling diary of what the sync did and where it stopped (flush started, write
 * failed, pull never finished…). Kept across restarts so a hang can be read afterwards and
 * sent along from «وضعیت ذخیره در شیت». Only operation kinds, tab names and error texts are
 * written, never cell values.
 */

const LOG_KEY = 'accounting_sync_log'

export const SYNC_LOG_LIMIT = 200

const MAX_DETAIL = 300

export interface SyncLogEntry {
  at: number
  event: string
  detail?: string
}

/** Spreadsheet ids and tokens in an error text are cut down to a short tail. */
function scrub(text: string): string {
  return text
    .replace(/[A-Za-z0-9_-]{30,}/g, match => `…${match.slice(-4)}`)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_DETAIL)
}

export function getSyncLog(): SyncLogEntry[] {
  return getItem<SyncLogEntry[]>(LOG_KEY) ?? []
}

export function logSync(event: string, detail?: string): void {
  try {
    const entries = getSyncLog()
    const last = entries[entries.length - 1]
    const text = detail ? scrub(detail) : undefined

    // A retry loop would otherwise push everything useful out of the buffer.
    if (last && last.event === event && last.detail === text && Date.now() - last.at < 60_000) {
      return
    }

    entries.push({ at: Date.now(), event, ...(text ? { detail: text } : {}) })
    setItem(LOG_KEY, entries.slice(-SYNC_LOG_LIMIT))
  } catch {
    /* a full or blocked storage must never break the sync itself */
  }
}

export function clearSyncLog(): void {
  try {
    removeItem(LOG_KEY)
  } catch {
    /* nothing to clear */
  }
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** `2026-10-19 14:03:07`, local time, sortable and easy to read in a chat message. */
export function formatLogTime(at: number): string {
  const date = new Date(at)

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export function formatSyncLog(entries: readonly SyncLogEntry[]): string {
  return entries
    .map(
      entry =>
        `${formatLogTime(entry.at)}  ${entry.event}${entry.detail ? `  ${entry.detail}` : ''}`
    )
    .join('\n')
}
