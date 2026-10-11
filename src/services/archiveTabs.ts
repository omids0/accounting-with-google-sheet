import { ARCHIVE_MARKER_KEY } from './recordArchive'
import { withGridGrowth } from './sheetGrid'
import { apiRequest, SHEETS_API } from './sheetsApi'
import { columnLetter } from './sheetsCellValues'
import { tabGridProperties } from './sheetsEnsure'
import { normalizeHeaderLabel } from './sheetsHeaders'
import { invalidateSheetTitlesCache, normalizeSheetTitle, quoteSheetName } from './sheetsMeta'
import { fetchSheetRangeFromApi } from './sheetsRows'
import { cellToString } from '../utils/sheetValues'

export interface TabInfo {
  sheetId: number
  title: string
  rowCount: number
  columnCount: number
  /** Carries the archive marker. */
  marked: boolean
}

interface TabsResponse {
  sheets?: {
    properties?: {
      sheetId?: number
      title?: string
      gridProperties?: { rowCount?: number; columnCount?: number }
    }
    developerMetadata?: { metadataKey?: string }[]
  }[]
}

/** Every tab's id, title, grid size and archive marker, in one request. */
export async function readTabs(spreadsheetId: string): Promise<Map<string, TabInfo>> {
  const fields = encodeURIComponent(
    'sheets(properties(sheetId,title,gridProperties(rowCount,columnCount)),developerMetadata(metadataKey))'
  )

  const data = await apiRequest<TabsResponse>(`${SHEETS_API}/${spreadsheetId}?fields=${fields}`)

  const tabs = new Map<string, TabInfo>()

  for (const sheet of data.sheets ?? []) {
    const props = sheet.properties

    if (!props?.title || props.sheetId === undefined) continue

    tabs.set(normalizeSheetTitle(props.title), {
      sheetId: props.sheetId,
      title: props.title,
      rowCount: props.gridProperties?.rowCount ?? 0,
      columnCount: props.gridProperties?.columnCount ?? 0,
      marked: (sheet.developerMetadata ?? []).some(item => item.metadataKey === ARCHIVE_MARKER_KEY)
    })
  }

  return tabs
}

function labels(row: unknown[]): string[] {
  const out = row.map(cell => normalizeHeaderLabel(cellToString(cell)))

  while (out.length && !out[out.length - 1]) out.pop()

  return out
}

async function writeHeader(spreadsheetId: string, title: string, header: string[]) {
  const range = encodeURIComponent(`${quoteSheetName(title)}!A1:${columnLetter(header.length)}1`)

  await withGridGrowth(spreadsheetId, title, 1, header.length, () =>
    apiRequest(`${SHEETS_API}/${spreadsheetId}/values/${range}?valueInputOption=RAW`, {
      method: 'PUT',
      body: JSON.stringify({ values: [header] })
    })
  )
}

/**
 * The archive tab, ready to receive rows with `header`'s columns. Created with
 * the marker in the same atomic request, so a crash never leaves an unmarked
 * archive. Null when a tab with that name is not ours, or its header is not
 * the form tab's header (an older prefix is extended, as column migrations do).
 */
export async function prepareArchiveTab(
  spreadsheetId: string,
  title: string,
  header: string[],
  tabs: Map<string, TabInfo>
): Promise<TabInfo | null> {
  const existing = tabs.get(normalizeSheetTitle(title))

  if (!existing) {
    const sheetId = 1_000_000_000 + Math.floor(Math.random() * 1_000_000_000)

    await apiRequest(`${SHEETS_API}/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [
          {
            addSheet: {
              properties: { sheetId, title, gridProperties: tabGridProperties(header.length) }
            }
          },
          {
            createDeveloperMetadata: {
              developerMetadata: {
                metadataKey: ARCHIVE_MARKER_KEY,
                metadataValue: '1',
                location: { sheetId },
                visibility: 'DOCUMENT'
              }
            }
          }
        ]
      })
    })
    invalidateSheetTitlesCache(spreadsheetId)
    await writeHeader(spreadsheetId, title, header)

    return { sheetId, title, rowCount: 2, columnCount: header.length, marked: true }
  }

  if (!existing.marked) return null

  const current = labels(
    (await fetchSheetRangeFromApi(spreadsheetId, existing.title, '1:1'))[0] ?? []
  )

  const wanted = labels(header)

  if (current.some((label, index) => label !== wanted[index])) return null
  if (current.length < wanted.length) await writeHeader(spreadsheetId, existing.title, header)

  return existing
}
