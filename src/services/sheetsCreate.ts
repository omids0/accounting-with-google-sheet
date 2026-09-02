import type { CustomForm } from '../types'
import { apiRequest, SHEETS_API } from './sheetsApi'
import { batchAddSheetTabs, writeSheetHeaders } from './sheetsEnsure'
import { buildHeaders } from './sheetsHeaders'
import { markSheetsPrepared, sheetTitlesCache, TITLES_CACHE_TTL_MS } from './sheetsMeta'

let createSpreadsheetLock: Promise<string> | null = null

export async function createSpreadsheet(title: string, forms: CustomForm[]): Promise<string> {
  if (createSpreadsheetLock) {
    return createSpreadsheetLock
  }

  createSpreadsheetLock = createSpreadsheetInner(title, forms).finally(() => {
    createSpreadsheetLock = null
  })

  return createSpreadsheetLock
}

async function createSpreadsheetInner(title: string, forms: CustomForm[]): Promise<string> {
  const data = await apiRequest<{ spreadsheetId: string }>(SHEETS_API, {
    method: 'POST',
    body: JSON.stringify({
      properties: { title },
      sheets: forms.map(form => ({
        properties: {
          title: form.sheetName,
          gridProperties: { frozenRowCount: 1 }
        }
      }))
    })
  })

  for (const form of forms) {
    const headers = buildHeaders(form.fields)

    await writeSheetHeaders(data.spreadsheetId, form.sheetName, headers)
  }

  markSheetsPrepared(
    data.spreadsheetId,
    forms.map(form => form.sheetName)
  )
  sheetTitlesCache.set(data.spreadsheetId, {
    titles: forms.map(form => form.sheetName),
    expiresAt: Date.now() + TITLES_CACHE_TTL_MS
  })

  return data.spreadsheetId
}

export async function addSheetTab(spreadsheetId: string, sheetName: string): Promise<void> {
  await batchAddSheetTabs(spreadsheetId, [sheetName])
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
