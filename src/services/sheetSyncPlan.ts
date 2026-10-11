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
  /** Hot tabs: every form and module tab. */
  allSheets: string[]
  /** False for callers that want everything (no mirror trust). */
  allowPartial: boolean
  hadData: boolean
  /** Tabs (hot or cold) whose change token moved; null when this device knows no tokens. */
  changed: string[] | null
  /** Drive modifiedTime differs from the one the mirror matches. */
  driveChanged: boolean
  fullSyncAt: number | null
  /** When a partial pull last accepted a Drive change it could not explain. */
  absorbedAt: number | null
  /** Cold tabs: yearly archives, which almost never change. */
  coldSheets: string[]
  /** Cold tabs this device has no copy of yet. */
  coldMissing: string[]
  /** When every cold tab was last downloaded. */
  coldSyncAt: number | null
  now: number
}

export interface SheetFetchPlan {
  sheets: string[]
  /** True when every hot tab is downloaded (resets the hot safety nets). */
  full: boolean
  /** True when a partial pull accepts a Drive change that may include a hand edit. */
  absorbs: boolean
  /** True when every cold tab is downloaded (resets the cold daily net). */
  cold: boolean
}

type HotPlan = Omit<SheetFetchPlan, 'cold'>

/**
 * Which hot tabs a pull downloads. App writes stamp a token on the tab they
 * touch, so a moved token names exactly what changed. A hand edit in Google
 * Sheets stamps nothing and only shows as a Drive change, so it downloads
 * every hot tab.
 */
function planHot(input: SheetFetchInput, changedHot: string[] | null): HotPlan {
  const everything = { sheets: input.allSheets, full: true, absorbs: false }

  const sinceFull = input.fullSyncAt === null ? Infinity : input.now - input.fullSyncAt

  if (!input.allowPartial || !input.hadData || changedHot === null) return everything

  if (sinceFull >= FULL_SYNC_MAX_AGE_MS) return everything

  const suspectDue = sinceFull >= SUSPECT_FULL_SYNC_MS

  if (input.absorbedAt !== null && suspectDue) return everything

  if (changedHot.length) {
    if (input.driveChanged && suspectDue) return everything

    return { sheets: changedHot, full: false, absorbs: input.driveChanged }
  }

  if (input.driveChanged) return everything

  return { sheets: [], full: false, absorbs: false }
}

/**
 * Hot plan plus archives. Archives come down when their own token moved, when
 * a full download finds one missing locally, and all of them once a day; a
 * hand edit or another device's write never re-downloads past years.
 */
export function planSheetFetch(input: SheetFetchInput): SheetFetchPlan {
  const cold = new Set(input.coldSheets)

  const changedHot = input.changed?.filter(name => !cold.has(name)) ?? null

  const changedCold = input.changed?.filter(name => cold.has(name)) ?? []

  const hot = planHot(input, changedHot)

  const sinceCold = input.coldSyncAt === null ? Infinity : input.now - input.coldSyncAt

  const allCold =
    !input.allowPartial ||
    !input.hadData ||
    input.changed === null ||
    sinceCold >= FULL_SYNC_MAX_AGE_MS

  const coldPart = allCold ? input.coldSheets : hot.full ? input.coldMissing : []

  const sheets = [...new Set([...hot.sheets, ...coldPart, ...changedCold])]

  return { ...hot, sheets, cold: allCold }
}
