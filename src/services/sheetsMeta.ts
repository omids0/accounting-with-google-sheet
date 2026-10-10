export const TITLES_CACHE_TTL_MS = 120_000

export const sheetTitlesCache = new Map<string, { titles: string[]; expiresAt: number }>()

export const preparedSheets = new Map<string, Set<string>>()

export function normalizeSheetTitle(title: string): string {
  return title.normalize('NFC').trim()
}

export function invalidateSpreadsheetCache(spreadsheetId: string): void {
  sheetTitlesCache.delete(spreadsheetId)
  preparedSheets.delete(spreadsheetId)
}

export function markSheetsPrepared(spreadsheetId: string, sheetNames: string[]): void {
  let set = preparedSheets.get(spreadsheetId)

  if (!set) {
    set = new Set()
    preparedSheets.set(spreadsheetId, set)
  }
  for (const name of sheetNames) {
    set.add(normalizeSheetTitle(name))
  }
}

export function isSheetPrepared(spreadsheetId: string, sheetName: string): boolean {
  return preparedSheets.get(spreadsheetId)?.has(normalizeSheetTitle(sheetName)) ?? false
}

export function invalidateSheetTitlesCache(spreadsheetId: string): void {
  sheetTitlesCache.delete(spreadsheetId)
}

export function parseSheetNameFromRange(range: string): string {
  const bang = range.indexOf('!')

  const raw = bang >= 0 ? range.slice(0, bang) : range

  if (raw.length >= 2 && raw.startsWith("'") && raw.endsWith("'")) {
    return raw.slice(1, -1).replace(/''/g, "'")
  }

  return raw
}

/** A1 sheet reference that stays valid for names with spaces or quotes. */
export function quoteSheetName(sheetName: string): string {
  return `'${sheetName.replace(/'/g, "''")}'`
}

/** Forget that these tabs were prepared, so the next ensure call checks (and creates) them. */
export function unmarkSheetsPrepared(spreadsheetId: string, sheetNames: string[]): void {
  const set = preparedSheets.get(spreadsheetId)

  for (const name of sheetNames) set?.delete(normalizeSheetTitle(name))
}

/** Requested tabs a download did not return, i.e. tabs missing from the spreadsheet. */
export function missingSheetNames(requested: string[], fetched: Iterable<string>): string[] {
  const got = new Set([...fetched].map(normalizeSheetTitle))

  return requested.filter(name => !got.has(normalizeSheetTitle(name)))
}
