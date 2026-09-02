import type { CustomForm } from '../types'
import { apiRequest, SHEETS_API, isSpreadsheetNotFoundError } from './sheetsApi'
import {
  invalidateSheetTitlesCache,
  invalidateSpreadsheetCache,
  isSheetPrepared,
  markSheetsPrepared,
  normalizeSheetTitle,
  parseSheetNameFromRange,
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

async function getSheetTitles(spreadsheetId: string, forceRefresh = false): Promise<string[]> {
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
    if (isSpreadsheetNotFoundError(err)) return false
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

async function batchAddSheetTabs(spreadsheetId: string, sheetNames: string[]): Promise<void> {
  if (!sheetNames.length) return

  await apiRequest(`${SHEETS_API}/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({
      requests: sheetNames.map(name => ({
        addSheet: { properties: { title: name } }
      }))
    })
  })
  invalidateSheetTitlesCache(spreadsheetId)
}

async function batchGetHeaderRows(
  spreadsheetId: string,
  sheetNames: string[]
): Promise<Map<string, string[]>> {
  if (!sheetNames.length) return new Map()

  const params = sheetNames.map(name => `ranges=${encodeURIComponent(`${name}!1:1`)}`).join('&')

  const data = await apiRequest<{
    valueRanges?: { range?: string; values?: string[][] }[]
  }>(`${SHEETS_API}/${spreadsheetId}/values:batchGet?${params}`)

  const result = new Map<string, string[]>()

  for (const valueRange of data.valueRanges ?? []) {
    if (!valueRange.range) continue

    const sheetName = parseSheetNameFromRange(valueRange.range)

    result.set(normalizeSheetTitle(sheetName), valueRange.values?.[0] ?? [])
  }

  return result
}

async function writeSheetHeaders(
  spreadsheetId: string,
  sheetName: string,
  headers: string[]
): Promise<void> {
  const endCol = String.fromCharCode(64 + headers.length)

  const range = encodeURIComponent(`${sheetName}!A1:${endCol}1`)

  await apiRequest(`${SHEETS_API}/${spreadsheetId}/values/${range}?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: [headers] })
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
    await batchAddSheetTabs(
      spreadsheetId,
      missingTabs.map(sheet => sheet.sheetName)
    )
    titles = await getSheetTitles(spreadsheetId, true)
  }

  const headerRows = await batchGetHeaderRows(
    spreadsheetId,
    pending.map(sheet => sheet.sheetName)
  )

  for (const sheet of pending) {
    const existing = headerRows.get(normalizeSheetTitle(sheet.sheetName)) ?? []

    const hasHeaders = existing.some(cell => String(cell ?? '').trim())

    if (!hasHeaders) {
      await writeSheetHeaders(spreadsheetId, sheet.sheetName, sheet.headers)
    }
    markSheetsPrepared(spreadsheetId, [sheet.sheetName])
  }
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
