import type { CustomForm } from '../types'
import { apiRequest, SHEETS_API, isSpreadsheetAccessDeniedError } from './sheetsApi'
import { columnLetter } from './sheetsCellValues'
import {
  invalidateSheetTitlesCache,
  invalidateSpreadsheetCache,
  isSheetPrepared,
  markSheetsPrepared,
  normalizeSheetTitle,
  parseSheetNameFromRange,
  quoteSheetName,
  sheetTitlesCache,
  TITLES_CACHE_TTL_MS
} from './sheetsMeta'

export interface SheetSpec {
  sheetName: string
  headers: string[]
}

const ensureSheetLocks = new Map<string, Promise<void>>()

const ensureManyLocks = new Map<string, Promise<void>>()

function sheetLockKey(spreadsheetId: string, sheetName: string): string {
  return `${spreadsheetId}:${normalizeSheetTitle(sheetName)}`
}

async function fetchSheetTitlesFromApi(spreadsheetId: string): Promise<string[]> {
  const meta = await apiRequest<{
    sheets?: { properties?: { title?: string } }[]
  }>(`${SHEETS_API}/${spreadsheetId}?fields=sheets.properties.title`)

  return (meta.sheets ?? []).map(s => s.properties?.title ?? '').filter(Boolean)
}

export async function getSheetTitles(
  spreadsheetId: string,
  forceRefresh = false
): Promise<string[]> {
  const cached = sheetTitlesCache.get(spreadsheetId)

  if (!forceRefresh && cached && Date.now() < cached.expiresAt) {
    return cached.titles
  }

  const titles = await fetchSheetTitlesFromApi(spreadsheetId)

  sheetTitlesCache.set(spreadsheetId, {
    titles,
    expiresAt: Date.now() + TITLES_CACHE_TTL_MS
  })

  return titles
}

function sheetExistsInTitles(titles: string[], sheetName: string): boolean {
  const target = normalizeSheetTitle(sheetName)

  return titles.some(title => normalizeSheetTitle(title) === target)
}

export async function verifySpreadsheetExists(spreadsheetId: string): Promise<boolean> {
  if (!spreadsheetId) return false

  try {
    await getSheetTitles(spreadsheetId)

    return true
  } catch (err) {
    // Deleted, or (under drive.file) never opened with this app: unusable either way.
    if (isSpreadsheetAccessDeniedError(err)) return false
    throw err
  }
}

export async function ensureSpreadsheet(
  spreadsheetId: string,
  title: string,
  forms: CustomForm[]
): Promise<string> {
  if (spreadsheetId && (await verifySpreadsheetExists(spreadsheetId))) {
    return spreadsheetId
  }

  invalidateSpreadsheetCache(spreadsheetId)

  const { createSpreadsheet } = await import('./sheetsCreate')

  return createSpreadsheet(title, forms)
}

/**
 * Exact grid for a new tab instead of Google's 1000×26 default; Sheets needs
 * one unfrozen row under the frozen header.
 */
export function tabGridProperties(headerCount: number) {
  return headerCount > 0 ? { rowCount: 2, columnCount: headerCount, frozenRowCount: 1 } : undefined
}

async function batchAddSheetTabs(spreadsheetId: string, sheets: SheetSpec[]): Promise<void> {
  if (!sheets.length) return

  await apiRequest(`${SHEETS_API}/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({
      requests: sheets.map(sheet => {
        const gridProperties = tabGridProperties(sheet.headers.length)

        return {
          addSheet: {
            properties: gridProperties
              ? { title: sheet.sheetName, gridProperties }
              : { title: sheet.sheetName }
          }
        }
      })
    })
  })
  invalidateSheetTitlesCache(spreadsheetId)
}

/**
 * Rows 1 and 2 of each tab. A tab missing from the map means its range was NOT returned: its
 * content is unknown, which is never the same as empty.
 */
async function batchGetTopRows(
  spreadsheetId: string,
  sheetNames: string[]
): Promise<Map<string, string[][]>> {
  if (!sheetNames.length) return new Map()

  const params = sheetNames
    .map(name => `ranges=${encodeURIComponent(`${quoteSheetName(name)}!1:2`)}`)
    .join('&')

  const data = await apiRequest<{
    valueRanges?: { range?: string; values?: string[][] }[]
  }>(`${SHEETS_API}/${spreadsheetId}/values:batchGet?${params}`)

  const result = new Map<string, string[][]>()

  for (const valueRange of data.valueRanges ?? []) {
    if (!valueRange.range) continue

    const sheetName = parseSheetNameFromRange(valueRange.range)

    result.set(normalizeSheetTitle(sheetName), valueRange.values ?? [])
  }

  return result
}

/**
 * Whether a tab may receive a header row: only when its range was returned AND rows 1 and 2 are
 * both empty. A header written over a tab that holds data re-labels every column of it.
 */
export function isVerifiablyEmptyTab(topRows: string[][] | undefined): boolean {
  if (!topRows) return false

  return !topRows.slice(0, 2).some(row => (row ?? []).some(cell => String(cell ?? '').trim()))
}

async function writeSheetHeaders(
  spreadsheetId: string,
  sheetName: string,
  headers: string[]
): Promise<void> {
  const range = encodeURIComponent(
    `${quoteSheetName(sheetName)}!A1:${columnLetter(headers.length)}1`
  )

  await apiRequest(`${SHEETS_API}/${spreadsheetId}/values/${range}?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: [headers] })
  })
}

/** Header rows of several tabs in ONE values:batchUpdate (a new file or a repair needs many). */
async function writeManySheetHeaders(spreadsheetId: string, sheets: SheetSpec[]): Promise<void> {
  await apiRequest(`${SHEETS_API}/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({
      valueInputOption: 'RAW',
      data: sheets.map(sheet => ({
        range: `${quoteSheetName(sheet.sheetName)}!A1:${columnLetter(sheet.headers.length)}1`,
        values: [sheet.headers]
      }))
    })
  })
}

export async function ensureManySheetsWithHeaders(
  spreadsheetId: string,
  sheets: SheetSpec[]
): Promise<void> {
  const pendingLock = ensureManyLocks.get(spreadsheetId)

  if (pendingLock) {
    await pendingLock

    return
  }

  const task = ensureManySheetsWithHeadersInner(spreadsheetId, sheets)

  ensureManyLocks.set(spreadsheetId, task)
  try {
    await task
  } finally {
    ensureManyLocks.delete(spreadsheetId)
  }
}

async function ensureManySheetsWithHeadersInner(
  spreadsheetId: string,
  sheets: SheetSpec[]
): Promise<void> {
  const pending = sheets.filter(sheet => !isSheetPrepared(spreadsheetId, sheet.sheetName))

  if (!pending.length) return

  let titles = await getSheetTitles(spreadsheetId)

  const missingTabs = pending.filter(sheet => !sheetExistsInTitles(titles, sheet.sheetName))

  if (missingTabs.length) {
    await batchAddSheetTabs(spreadsheetId, missingTabs)
    titles = await getSheetTitles(spreadsheetId, true)
  }

  const topRows = await batchGetTopRows(
    spreadsheetId,
    pending.map(sheet => sheet.sheetName)
  )

  const headerless = pending.filter(sheet =>
    isVerifiablyEmptyTab(topRows.get(normalizeSheetTitle(sheet.sheetName)))
  )

  if (headerless.length === 1) {
    await writeSheetHeaders(spreadsheetId, headerless[0].sheetName, headerless[0].headers)
  } else if (headerless.length > 1) {
    await writeManySheetHeaders(spreadsheetId, headerless)
  }
  // A tab whose range never came back stays unprepared, so the next call looks at it again.
  markSheetsPrepared(
    spreadsheetId,
    pending
      .filter(sheet => topRows.has(normalizeSheetTitle(sheet.sheetName)))
      .map(sheet => sheet.sheetName)
  )
}

export async function ensureSheetWithHeaders(
  spreadsheetId: string,
  sheetName: string,
  headers: string[]
): Promise<void> {
  const lockKey = sheetLockKey(spreadsheetId, sheetName)

  const pending = ensureSheetLocks.get(lockKey)

  if (pending) return pending

  const task = ensureManySheetsWithHeaders(spreadsheetId, [{ sheetName, headers }])

  ensureSheetLocks.set(lockKey, task)
  try {
    await task
  } finally {
    ensureSheetLocks.delete(lockKey)
  }
}

export async function getSheetId(spreadsheetId: string, sheetName: string): Promise<number> {
  const meta = await apiRequest<{
    sheets?: { properties?: { title?: string; sheetId?: number } }[]
  }>(`${SHEETS_API}/${spreadsheetId}?fields=sheets.properties(title,sheetId)`)

  const target = normalizeSheetTitle(sheetName)

  const sheet = (meta.sheets ?? []).find(
    item => normalizeSheetTitle(item.properties?.title ?? '') === target
  )

  const sheetId = sheet?.properties?.sheetId

  if (sheetId == null) {
    throw new Error(`شیت «${sheetName}» یافت نشد`)
  }

  return sheetId
}

export { batchAddSheetTabs, writeSheetHeaders }
