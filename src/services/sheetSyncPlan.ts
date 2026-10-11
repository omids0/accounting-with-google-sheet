/**
 * Safety net: at least one download of every tab per day. It catches the rare
 * race no rule below can see (two writes within the same second).
 */
export const FULL_SYNC_MAX_AGE_MS = 24 * 60 * 60_000

/**
 * A Drive change that arrives together with moved tokens may also hide a hand
 * edit on another tab: app writes and hand edits both move Drive's time. Those
 * pulls stay partial, but a full download follows within this window.
 */
export const SUSPECT_FULL_SYNC_MS = 15 * 60_000

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
  /** When a partial pull last accepted a Drive change it could not explain. */
  absorbedAt: number | null
  now: number
}

export interface SheetFetchPlan {
  sheets: string[]
  /** True when every tab is downloaded (resets both safety nets). */
  full: boolean
  /** True when a partial pull accepts a Drive change that may include a hand edit. */
  absorbs: boolean
}

/**
 * Which tabs a pull downloads. App writes stamp a token on the tab they touch,
 * so a moved token names exactly what changed. A hand edit in Google Sheets
 * stamps nothing and only shows as a Drive change, so it downloads everything.
 */
export function planSheetFetch(input: SheetFetchInput): SheetFetchPlan {
  const everything = { sheets: input.allSheets, full: true, absorbs: false }

  const sinceFull = input.fullSyncAt === null ? Infinity : input.now - input.fullSyncAt

  if (!input.allowPartial || !input.hadData || input.changed === null) return everything

  if (sinceFull >= FULL_SYNC_MAX_AGE_MS) return everything

  const suspectDue = sinceFull >= SUSPECT_FULL_SYNC_MS

  if (input.absorbedAt !== null && suspectDue) return everything

  if (input.changed.length) {
    if (input.driveChanged && suspectDue) return everything

    return { sheets: input.changed, full: false, absorbs: input.driveChanged }
  }

  if (input.driveChanged) return everything

  return { sheets: [], full: false, absorbs: false }
}
