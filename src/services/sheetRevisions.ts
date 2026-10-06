import { apiRequest, SHEETS_API } from './sheetsApi'
import { normalizeSheetTitle } from './sheetsMeta'

/**
 * Per-sheet change tokens kept as developer metadata on each tab. Every write
 * this app sends stamps a fresh token on the tab it touched, so another device
 * can read all tokens in one small request and download only the tabs whose
 * token moved. Edits made by hand in Google Sheets do not stamp anything; Drive's
 * modifiedTime catches those and the caller falls back to a full download.
 */
export const REVISION_METADATA_KEY = 'accounting_rev'

interface RevisionEntry {
  sheetId: number
  /** Joined value of every matching metadata entry (duplicates can appear after concurrent creates). */
  token: string
  metadataIds: number[]
}

export type RevisionMap = Map<string, RevisionEntry>

interface SpreadsheetMetadataResponse {
  sheets?: {
    properties?: { sheetId?: number; title?: string }
    developerMetadata?: { metadataId?: number; metadataKey?: string; metadataValue?: string }[]
  }[]
}

/** Last tokens this device has data for, per spreadsheet (session memory). */
const seenTokens = new Map<string, Map<string, string>>()

function sheetKey(title: string): string {
  return normalizeSheetTitle(title)
}

export async function fetchSheetRevisions(spreadsheetId: string): Promise<RevisionMap> {
  const fields = encodeURIComponent(
    'sheets(properties(sheetId,title),developerMetadata(metadataId,metadataKey,metadataValue))'
  )

  const data = await apiRequest<SpreadsheetMetadataResponse>(
    `${SHEETS_API}/${spreadsheetId}?fields=${fields}`
  )

  const map: RevisionMap = new Map()

  for (const sheet of data.sheets ?? []) {
    const title = sheet.properties?.title
    const sheetId = sheet.properties?.sheetId

    if (!title || sheetId === undefined) continue

    const own = (sheet.developerMetadata ?? []).filter(
      item => item.metadataKey === REVISION_METADATA_KEY
    )

    map.set(sheetKey(title), {
      sheetId,
      token: own
        .map(item => item.metadataValue ?? '')
        .sort()
        .join('|'),
      metadataIds: own.map(item => item.metadataId).filter((id): id is number => id !== undefined)
    })
  }

  return map
}

/**
 * Tabs whose token differs from what this device last downloaded. Returns null
 * when nothing is known yet for this session (caller must download everything).
 */
export function findChangedSheets(
  spreadsheetId: string,
  sheetNames: string[],
  revisions: RevisionMap
): string[] | null {
  const seen = seenTokens.get(spreadsheetId)

  if (!seen) return null

  return sheetNames.filter(name => {
    const key = sheetKey(name)

    return (revisions.get(key)?.token ?? '') !== (seen.get(key) ?? '')
  })
}

/** Records that the local mirror now holds these tabs as of `revisions`. */
export function markSheetsSeen(
  spreadsheetId: string,
  sheetNames: string[],
  revisions: RevisionMap
): void {
  const seen = seenTokens.get(spreadsheetId) ?? new Map<string, string>()

  for (const name of sheetNames) {
    const key = sheetKey(name)

    seen.set(key, revisions.get(key)?.token ?? '')
  }

  seenTokens.set(spreadsheetId, seen)
}

function newToken(): string {
  return `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`
}

/**
 * Stamps a fresh token on every tab this device just wrote to. Best effort: if
 * it fails, other devices still notice the change through Drive's modifiedTime.
 */
export async function stampSheetRevisions(
  spreadsheetId: string,
  sheetNames: Iterable<string>
): Promise<void> {
  const names = [...new Set(sheetNames)]

  if (!names.length) return

  const seenBefore = seenTokens.get(spreadsheetId)

  // A fresh read tells whether another device stamped a tab since this device
  // last downloaded it; such tabs stay "unseen" so the next pull fetches them.
  const layout = await fetchSheetRevisions(spreadsheetId)

  const requests: unknown[] = []
  const stamped = new Map<string, { token: string; changedElsewhere: boolean }>()

  for (const name of names) {
    const entry = layout.get(sheetKey(name))

    if (!entry) continue

    const token = newToken()

    stamped.set(sheetKey(name), {
      token,
      changedElsewhere: !seenBefore || entry.token !== (seenBefore.get(sheetKey(name)) ?? '')
    })

    if (entry.metadataIds.length) {
      for (const metadataId of entry.metadataIds) {
        requests.push({
          updateDeveloperMetadata: {
            dataFilters: [{ developerMetadataLookup: { metadataId } }],
            developerMetadata: { metadataValue: token },
            fields: 'metadataValue'
          }
        })
      }
    } else {
      requests.push({
        createDeveloperMetadata: {
          developerMetadata: {
            metadataKey: REVISION_METADATA_KEY,
            metadataValue: token,
            location: { sheetId: entry.sheetId },
            visibility: 'DOCUMENT'
          }
        }
      })
    }
  }

  if (!requests.length) return

  const response = await apiRequest<{
    replies?: { createDeveloperMetadata?: { developerMetadata?: { metadataId?: number } } }[]
  }>(`${SHEETS_API}/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({ requests })
  })

  // Our own writes are already in the local mirror: remember the new tokens so
  // the next check does not download these tabs again.
  let replyIndex = 0

  for (const [key, { token, changedElsewhere }] of stamped) {
    const entry = layout.get(key)

    if (!entry) continue

    if (!entry.metadataIds.length) {
      const createdId =
        response.replies?.[replyIndex]?.createDeveloperMetadata?.developerMetadata?.metadataId

      if (createdId !== undefined) entry.metadataIds = [createdId]
      replyIndex += 1
    } else {
      replyIndex += entry.metadataIds.length
    }

    const joined = entry.metadataIds.map(() => token).join('|')

    entry.token = joined
    if (!changedElsewhere) seenBefore?.set(key, joined)
  }
}

export function forgetSheetRevisions(spreadsheetId: string): void {
  seenTokens.delete(spreadsheetId)
}
