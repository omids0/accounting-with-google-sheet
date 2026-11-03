import { getDefaultSettings, getSettings, saveSettings } from './settings'
import { getItem, setItem } from './storage'
import { setWorkspaceType, WORKSPACE_STORAGE_KEY } from './workspace'

/**
 * Parent side of «فرزندان من»: the children whose personal spreadsheet this device follows
 * read-only. Device-local, listed in `ACCOUNT_KEYS` (localDataWipe.ts) so signing out clears it.
 *
 * Public API:
 * - `listChildren()`, `getChild(id)` read the registry.
 * - `addChild({ id, name, email? })` adds (or updates) a child and mirrors it into
 *   `settings.spreadsheets[]` with `kind: 'child'` and the device-local workspace type `child`.
 *   Several children are allowed. The record's `id` is the child's spreadsheet id.
 * - `renameChild(id, name)` renames the record and its settings entry.
 * - `removeChild(id)` drops the record, the settings entry and the cached type. Refused (false)
 *   while the child is the open sheet. Prefer `forgetChild` (childForget.ts) from the UI.
 */
export const CHILDREN_STORAGE_KEY = 'accounting_children_v1'

export interface ChildRecord {
  /** The child's spreadsheet id. */
  id: string
  name: string
  /** The child's e-mail when the parent knows it (invite text); optional. */
  email?: string
  addedAt: string
}

export function listChildren(): ChildRecord[] {
  const stored = getItem<ChildRecord[]>(CHILDREN_STORAGE_KEY)

  return Array.isArray(stored) ? stored.filter(child => Boolean(child?.id)) : []
}

export function getChild(id: string): ChildRecord | undefined {
  return listChildren().find(child => child.id === id)
}

/** The settings entry of the child kept in step with the record (name, `kind: 'child'`). */
function mirrorIntoSettings(id: string, name: string): void {
  const settings = getSettings() ?? getDefaultSettings()

  const known = settings.spreadsheets ?? []

  saveSettings({
    ...settings,
    spreadsheets: known.some(sheet => sheet.id === id)
      ? known.map(sheet => (sheet.id === id ? { ...sheet, name, kind: 'child' } : sheet))
      : [...known, { id, name, createdAt: new Date().toISOString(), kind: 'child' }]
  })
}

export function addChild(input: { id: string; name: string; email?: string }): ChildRecord {
  const previous = getChild(input.id)

  const record: ChildRecord = {
    id: input.id,
    name: input.name.trim() || previous?.name || 'فرزند',
    email: input.email?.trim().toLowerCase() || previous?.email,
    addedAt: previous?.addedAt ?? new Date().toISOString()
  }

  setItem(CHILDREN_STORAGE_KEY, [...listChildren().filter(child => child.id !== input.id), record])
  setWorkspaceType(input.id, 'child')
  mirrorIntoSettings(record.id, record.name)

  return record
}

export function renameChild(id: string, name: string): ChildRecord | undefined {
  const current = getChild(id)
  const next = name.trim()

  if (!current || !next) return current

  const record = { ...current, name: next }

  setItem(
    CHILDREN_STORAGE_KEY,
    listChildren().map(child => (child.id === id ? record : child))
  )
  mirrorIntoSettings(id, next)

  return record
}

export function removeChild(id: string): boolean {
  const settings = getSettings()

  if (settings?.spreadsheetId === id) return false

  const types = { ...getItem<Record<string, string>>(WORKSPACE_STORAGE_KEY) }

  delete types[id]
  setItem(WORKSPACE_STORAGE_KEY, types)
  setItem(
    CHILDREN_STORAGE_KEY,
    listChildren().filter(child => child.id !== id)
  )
  if (settings) {
    saveSettings({
      ...settings,
      spreadsheets: settings.spreadsheets?.filter(sheet => sheet.id !== id)
    })
  }

  return true
}
