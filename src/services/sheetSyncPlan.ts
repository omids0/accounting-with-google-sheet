/**
 * Safety net: at least one download of every tab per day. It catches the rare
 * hand edit in Google Sheets made at the same moment another device wrote
 * (the token change hides the Drive change from the rules below).
 */
export const FULL_SYNC_MAX_AGE_MS = 24 * 60 * 60_000

export interface SheetFetchInput {
  allSheets: string[]
  /** False for callers that want everything (no mirror trust). */
  allowPartial: boolean
  hadData: boolean
  /** Tabs whose change token moved; null when this device knows no tokens. */
  changed: string[] | null
  /** Drive modifiedTime differs from the one the mirror matches. */
  driveChanged: boolean
  fullSyncAt: number | null
  now: number
}

export interface SheetFetchPlan {
  sheets: string[]
  /** True when every tab is downloaded (resets the daily safety net). */
  full: boolean
}

/**
 * Which tabs a pull downloads. App writes stamp a token on the tab they touch,
 * so a moved token names exactly what changed. A hand edit in Google Sheets
 * stamps nothing and only shows as a Drive change, so it downloads everything.
 */
export function planSheetFetch(input: SheetFetchInput): SheetFetchPlan {
  const everything = { sheets: input.allSheets, full: true }

  const stale = input.fullSyncAt === null || input.now - input.fullSyncAt >= FULL_SYNC_MAX_AGE_MS

  if (!input.allowPartial || !input.hadData || input.changed === null || stale) return everything

  if (input.changed.length) return { sheets: input.changed, full: false }

  if (input.driveChanged) return everything

  return { sheets: [], full: false }
}
