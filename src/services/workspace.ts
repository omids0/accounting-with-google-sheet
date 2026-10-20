import { PERIOD_SETTINGS_SHEET } from './sheetNames'
import { SPREADSHEET_TITLE_PREFIX } from './spreadsheetCatalog'
import { getItem, getStorageVersion, setItem, STORAGE_KEYS } from './storage'
import type { WorkspaceKind } from '../types'

/**
 * Round 11: every building is its own spreadsheet. The type lives in the sheet («تنظیمات دوره»,
 * row `نوع فضا`) and is cached here so the menu and the forms know it without waiting for a sync.
 * Kept tiny and dependency-light: settings.ts reads it on every `getSettings()`.
 */
export type WorkspaceType = WorkspaceKind

/** `{ [spreadsheetId]: 'building' }`, absent = personal; listed in `ACCOUNT_KEYS`. */
export const WORKSPACE_STORAGE_KEY = 'accounting_workspace_v1'

export const WORKSPACE_TYPE_ROW = 'نوع فضا'

export const WORKSPACE_BUILDING_VALUE = 'ساختمان'

type Store = Record<string, WorkspaceType>

let cached: { version: number; store: Store; activeId: string } | null = null

function read(): { store: Store; activeId: string } {
  const version = getStorageVersion()

  if (cached?.version !== version) {
    cached = {
      version,
      store: getItem<Store>(WORKSPACE_STORAGE_KEY) ?? {},
      activeId: getItem<{ spreadsheetId?: string }>(STORAGE_KEYS.SETTINGS)?.spreadsheetId ?? ''
    }
  }

  return cached
}

const listeners = new Set<() => void>()

export function subscribeWorkspace(listener: () => void): () => void {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

export function hasWorkspaceType(spreadsheetId: string): boolean {
  return spreadsheetId in read().store
}

export function getWorkspaceType(spreadsheetId: string): WorkspaceType {
  return read().store[spreadsheetId] === 'building' ? 'building' : 'personal'
}

export function getActiveWorkspaceType(): WorkspaceType {
  return getWorkspaceType(read().activeId)
}

/** A registered building, or a sheet this device already read the type of. */
export function isBuildingEntry(entry: { id: string; kind?: WorkspaceKind }): boolean {
  return entry.kind === 'building' || getWorkspaceType(entry.id) === 'building'
}

/** The manager's own spreadsheet, remembered per device when a building is entered. */
export const PERSONAL_SHEET_KEY = 'accounting_personal_sheet'

export function rememberPersonalSheet(spreadsheetId: string): void {
  try {
    if (spreadsheetId) setItem(PERSONAL_SHEET_KEY, spreadsheetId)
  } catch {
    // Private mode: the first non-building sheet is used instead.
  }
}

/**
 * The manager's own spreadsheet: the one remembered when a building was entered, else the first
 * that is not a building. A Drive-listed «ساختمان …» sheet this device never registered counts as
 * a building too, so it can never be taken for the personal one.
 */
export function personalSpreadsheet<T extends { id: string; name?: string; kind?: WorkspaceKind }>(
  entries: T[]
): T | undefined {
  const isPersonal = (entry: T) =>
    entry.kind !== 'building' &&
    getWorkspaceType(entry.id) !== 'building' &&
    !(entry.name ?? '').replace(SPREADSHEET_TITLE_PREFIX, '').startsWith('ساختمان ')

  const remembered = getItem<string>(PERSONAL_SHEET_KEY)

  return (
    entries.find(entry => entry.id === remembered && isPersonal(entry)) ?? entries.find(isPersonal)
  )
}

export function setWorkspaceType(spreadsheetId: string, type: WorkspaceType): void {
  if (!spreadsheetId) return

  try {
    setItem(WORKSPACE_STORAGE_KEY, { ...read().store, [spreadsheetId]: type })
  } catch {
    // Private mode: the next sync reads the sheet again.
  }
  listeners.forEach(listener => listener())
}

/**
 * Reads the marker row of the spreadsheet and caches it. A failed read changes nothing, so
 * going offline never turns a known building into a personal sheet.
 */
export async function syncWorkspaceTypeFromSheet(spreadsheetId: string): Promise<WorkspaceType> {
  try {
    const { fetchSheetRows } = await import('./sheets')
    const rows = await fetchSheetRows(spreadsheetId, PERIOD_SETTINGS_SHEET)

    const marker = rows.find(row => String(row[0] ?? '').trim() === WORKSPACE_TYPE_ROW)

    const type: WorkspaceType =
      String(marker?.[1] ?? '').trim() === WORKSPACE_BUILDING_VALUE ? 'building' : 'personal'

    if (!hasWorkspaceType(spreadsheetId) || getWorkspaceType(spreadsheetId) !== type) {
      setWorkspaceType(spreadsheetId, type)
      // Saving normalizes the stored forms again, now with (or without) the building fields.
      const { getSettings, saveSettings } = await import('./settings')
      const settings = getSettings()

      if (settings) saveSettings(settings)
    }

    return type
  } catch {
    return getWorkspaceType(spreadsheetId)
  }
}
