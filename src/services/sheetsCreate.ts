import type { CustomForm } from '../types'
import { apiRequest, SHEETS_API } from './sheetsApi'
import { columnLetter, toSheetRowValues } from './sheetsCellValues'
import { batchAddSheetTabs, tabGridProperties } from './sheetsEnsure'
import { buildHeaders } from './sheetsHeaders'
import {
  markSheetsPrepared,
  quoteSheetName,
  sheetTitlesCache,
  TITLES_CACHE_TTL_MS
} from './sheetsMeta'

/** A tab written when the spreadsheet is created: its header row and, optionally, first rows. */
export interface NewSheetTab {
  sheetName: string
  headers: string[]
  rows?: string[][]
}

let createSpreadsheetLock: Promise<string> | null = null

/**
 * Creates the spreadsheet with the tabs of `forms` plus `extraTabs`: ONE request makes the file and
 * all its tabs, ONE more writes every header row (and the given first rows). A building used to
 * need about sixteen sequential requests for the same result.
 */
export async function createSpreadsheet(
  title: string,
  forms: CustomForm[],
  extraTabs: NewSheetTab[] = []
): Promise<string> {
  if (createSpreadsheetLock) {
    return createSpreadsheetLock
  }

  createSpreadsheetLock = createSpreadsheetInner(title, forms, extraTabs).finally(() => {
    createSpreadsheetLock = null
  })

  return createSpreadsheetLock
}

/** Exact grid for a new tab: the header, its first rows and one free row under a frozen header. */
function newTabGrid(tab: NewSheetTab) {
  const rows = tab.rows ?? []

  const width = Math.max(tab.headers.length, ...rows.map(row => row.length))

  return rows.length === 0
    ? tabGridProperties(width) ?? { frozenRowCount: 1 }
    : { rowCount: 1 + rows.length, columnCount: width, frozenRowCount: 1 }
}

async function createSpreadsheetInner(
  title: string,
  forms: CustomForm[],
  extraTabs: NewSheetTab[]
): Promise<string> {
  const tabs: NewSheetTab[] = [
    ...forms.map(form => ({ sheetName: form.sheetName, headers: buildHeaders(form.fields) })),
    ...extraTabs.filter(extra => !forms.some(form => form.sheetName === extra.sheetName))
  ]

  const data = await apiRequest<{ spreadsheetId: string }>(SHEETS_API, {
    method: 'POST',
    body: JSON.stringify({
      properties: { title },
      sheets: tabs.map(tab => ({
        properties: { title: tab.sheetName, gridProperties: newTabGrid(tab) }
      }))
    })
  })

  const written = tabs.filter(tab => tab.headers.length > 0)

  if (written.length) {
    await apiRequest(`${SHEETS_API}/${data.spreadsheetId}/values:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        valueInputOption: 'RAW',
        data: written.map(tab => ({
          range: `${quoteSheetName(tab.sheetName)}!A1:${columnLetter(
            Math.max(tab.headers.length, ...(tab.rows ?? []).map(row => row.length))
          )}${1 + (tab.rows?.length ?? 0)}`,
          values: [tab.headers, ...(tab.rows ?? []).map(toSheetRowValues)]
        }))
      })
    })
  }

  markSheetsPrepared(
    data.spreadsheetId,
    tabs.map(tab => tab.sheetName)
  )
  sheetTitlesCache.set(data.spreadsheetId, {
    titles: tabs.map(tab => tab.sheetName),
    expiresAt: Date.now() + TITLES_CACHE_TTL_MS
  })

  return data.spreadsheetId
}

export async function addSheetTab(spreadsheetId: string, sheetName: string): Promise<void> {
  await batchAddSheetTabs(spreadsheetId, [{ sheetName, headers: [] }])
}

export async function ensureFormSheet(spreadsheetId: string, form: CustomForm): Promise<void> {
  const { ensureManySheetsWithHeaders } = await import('./sheetsEnsure')

  await ensureManySheetsWithHeaders(spreadsheetId, [
    { sheetName: form.sheetName, headers: buildHeaders(form.fields) }
  ])
}

export function getSpreadsheetUrl(sheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}`
}
