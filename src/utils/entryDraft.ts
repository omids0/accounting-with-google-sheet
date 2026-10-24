/**
 * The entry form (/entry) keeps what is typed in sessionStorage, so leaving the page by mistake
 * does not lose it. Only fields that differ from the form's own starting values are stored
 * (a stale date never comes back), and nothing is stored while the form is untouched.
 * `sessionStorage` is already prefixed in the dev build (`devStorageIsolation`).
 */
export type EntryDraftValues = Record<string, string | number>

export const ENTRY_DRAFT_TTL_MS = 24 * 60 * 60 * 1000

const KEY_PREFIX = 'accounting_entry_draft:'

type StoredDraft = { savedAt: number; values: EntryDraftValues }

const normalized = (value: unknown) => String(value ?? '').trim()

/** The fields the user changed from `initial`. Empty when the form is untouched. */
export function changedEntryValues(
  values: EntryDraftValues,
  initial: EntryDraftValues
): EntryDraftValues {
  const changed: EntryDraftValues = {}

  for (const [id, value] of Object.entries(values)) {
    if (normalized(value) !== normalized(initial[id])) changed[id] = value
  }

  return changed
}

/** Reads a stored draft; null when it is malformed, older than 24 h, or has no known field. */
export function parseEntryDraft(
  raw: string | null,
  fieldIds: readonly string[],
  now: number
): EntryDraftValues | null {
  if (!raw) return null

  try {
    const stored = JSON.parse(raw) as Partial<StoredDraft> | null
    const savedAt = Number(stored?.savedAt)

    if (!stored?.values || !Number.isFinite(savedAt)) return null
    if (now - savedAt > ENTRY_DRAFT_TTL_MS || now < savedAt) return null

    const values: EntryDraftValues = {}

    for (const id of fieldIds) {
      const value = stored.values[id]

      if (typeof value === 'string' || typeof value === 'number') values[id] = value
    }

    return Object.keys(values).length > 0 ? values : null
  } catch {
    return null
  }
}

function withStorage<T>(action: (storage: Storage) => T, fallback: T): T {
  try {
    return action(sessionStorage)
  } catch {
    return fallback
  }
}

export function loadEntryDraft(
  formId: string,
  fieldIds: readonly string[],
  now = Date.now()
): EntryDraftValues | null {
  return withStorage(
    storage => parseEntryDraft(storage.getItem(KEY_PREFIX + formId), fieldIds, now),
    null
  )
}

export function clearEntryDraft(formId: string): void {
  withStorage(storage => storage.removeItem(KEY_PREFIX + formId), undefined)
}

/** Stores the changed fields, or drops the draft when nothing differs from `initial`. */
export function saveEntryDraft(
  formId: string,
  values: EntryDraftValues,
  initial: EntryDraftValues,
  now = Date.now()
): void {
  const changed = changedEntryValues(values, initial)

  if (Object.keys(changed).length === 0) return clearEntryDraft(formId)

  const stored: StoredDraft = { savedAt: now, values: changed }

  withStorage(storage => storage.setItem(KEY_PREFIX + formId, JSON.stringify(stored)), undefined)
}

/** Sign-out: a draft belongs to the account that typed it. */
export function clearAllEntryDrafts(): void {
  withStorage(storage => {
    const keys: string[] = []

    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)

      if (key?.startsWith(KEY_PREFIX)) keys.push(key)
    }
    keys.forEach(key => storage.removeItem(key))
  }, undefined)
}
