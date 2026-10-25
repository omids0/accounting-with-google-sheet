import { SHARED_NAME_PREFIX, WORKSPACE_SHARED_VALUE } from './sharedWorkspace'
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

/** `{ [spreadsheetId]: 'building' | 'shared' }`, absent = personal; listed in `ACCOUNT_KEYS`. */
export const WORKSPACE_STORAGE_KEY = 'accounting_workspace_v1'

export const WORKSPACE_TYPE_ROW = 'نوع فضا'

export const WORKSPACE_BUILDING_VALUE = 'ساختمان'

type Store = Record<string, WorkspaceType>

interface Snapshot {
  version: number
  store: Store
  /** `kind` of the spreadsheets this device registered: known the moment a sheet is listed. */
  kinds: Record<string, WorkspaceKind | undefined>
  activeId: string
}

let cached: Snapshot | null = null

function read(): Snapshot {
  const version = getStorageVersion()

  if (cached?.version !== version) {
    const settings = getItem<{
      spreadsheetId?: string
      spreadsheets?: { id: string; kind?: WorkspaceKind }[]
    }>(STORAGE_KEYS.SETTINGS)

    cached = {
      version,
      store: getItem<Store>(WORKSPACE_STORAGE_KEY) ?? {},
      kinds: Object.fromEntries(
        (settings?.spreadsheets ?? []).map(sheet => [sheet.id, sheet.kind])
      ),
      activeId: settings?.spreadsheetId ?? ''
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

/**
 * What the sheet itself said wins; before that, the `kind` the registry holds, so a building
 * listed on this device is never taken for a personal sheet while its type is still unread.
 */
export function getWorkspaceType(spreadsheetId: string): WorkspaceType {
  const { store, kinds } = read()

  const type = store[spreadsheetId] ?? kinds[spreadsheetId]

  return type === 'building' || type === 'shared' ? type : 'personal'
}

/** A registered shared account, or a sheet this device already read the marker of. */
export function isSharedEntry(entry: { id: string; kind?: WorkspaceKind }): boolean {
  return entry.kind === 'shared' || getWorkspaceType(entry.id) === 'shared'
}

/** The registered shared account's spreadsheet, or null when this device has none. */
export function sharedSpreadsheetId(): string | null {
  const { kinds } = read()

  return Object.keys(kinds).find(id => kinds[id] === 'shared') ?? null
}

export function hasSharedAccount(): boolean {
  return sharedSpreadsheetId() !== null
}

/** False only for a sheet this device has neither read the marker row of nor registered a kind for. */
export function isWorkspaceTypeKnown(spreadsheetId: string): boolean {
  const { store, kinds } = read()

  return spreadsheetId in store || Boolean(kinds[spreadsheetId])
}

/** `unknown` while the active sheet's type is unresolved: pages must not guess `personal` then. */
export function getActiveWorkspaceResolution(): WorkspaceType | 'unknown' {
  const { activeId } = read()

  return !activeId || isWorkspaceTypeKnown(activeId) ? getWorkspaceType(activeId) : 'unknown'
}

export function getActiveWorkspaceType(): WorkspaceType {
  return getWorkspaceType(read().activeId)
}

/** The type of `spreadsheetId`, or of the active spreadsheet when none is given. */
export function workspaceTypeOf(spreadsheetId?: string): WorkspaceType {
  return spreadsheetId ? getWorkspaceType(spreadsheetId) : getActiveWorkspaceType()
}

export const NOT_BUILDING_FILE_MESSAGE = 'این کار فقط در فایل ساختمان انجام می‌شود'

export const NOT_MEMBER_FILE_MESSAGE = 'این کار فقط در فایل ساختمان یا حساب مشترک انجام می‌شود'

/**
 * Building data (tabs, marker rows) belongs to the building's own spreadsheet only. Every building
 * writer calls this first, so a personal spreadsheet can never receive any of it.
 */
export function assertBuildingSpreadsheet(spreadsheetId: string): void {
  if (getWorkspaceType(spreadsheetId) !== 'building') throw new Error(NOT_BUILDING_FILE_MESSAGE)
}

/**
 * Member data (the member list, invitations, who-paid fields) belongs to a building's or a shared
 * account's own spreadsheet only; a personal spreadsheet can never receive any of it.
 */
export function assertMemberWorkspace(spreadsheetId: string): void {
  if (getWorkspaceType(spreadsheetId) === 'personal') throw new Error(NOT_MEMBER_FILE_MESSAGE)
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
  const isPersonal = (entry: T) => {
    const name = (entry.name ?? '').replace(SPREADSHEET_TITLE_PREFIX, '')

    return (
      entry.kind !== 'building' &&
      entry.kind !== 'shared' &&
      getWorkspaceType(entry.id) === 'personal' &&
      !name.startsWith('ساختمان ') &&
      !name.startsWith(SHARED_NAME_PREFIX)
    )
  }

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

    const value = String(marker?.[1] ?? '').trim()

    const type: WorkspaceType =
      value === WORKSPACE_BUILDING_VALUE
        ? 'building'
        : value === WORKSPACE_SHARED_VALUE
        ? 'shared'
        : 'personal'

    if (!hasWorkspaceType(spreadsheetId) || getWorkspaceType(spreadsheetId) !== type) {
      setWorkspaceType(spreadsheetId, type)
      // Saving normalizes the stored forms again, now with (or without) the building fields, and
      // keeps the registry's `kind` in step with what the sheet says.
      const { getSettings, saveSettings } = await import('./settings')
      const settings = getSettings()

      if (settings) {
        saveSettings({
          ...settings,
          spreadsheets: settings.spreadsheets?.map(sheet =>
            sheet.id === spreadsheetId && (sheet.kind ?? 'personal') !== type
              ? { ...sheet, kind: type }
              : sheet
          )
        })
      }
    }

    return type
  } catch {
    return getWorkspaceType(spreadsheetId)
  }
}

/**
 * Reads the marker row of a sheet that is about to become the active one, when nothing says what
 * it is yet. Called before the switch, so the first frame of the new sheet already has its own
 * menu and pages instead of the personal ones.
 */
export async function resolveWorkspaceType(spreadsheetId: string): Promise<WorkspaceType> {
  if (isWorkspaceTypeKnown(spreadsheetId)) return getWorkspaceType(spreadsheetId)

  return syncWorkspaceTypeFromSheet(spreadsheetId)
}
