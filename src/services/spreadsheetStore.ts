import {
  cancelScheduledPersist,
  deleteSnapshot,
  loadPersistedSnapshot,
  readLastSyncedAt,
  registerSnapshotProvider,
  schedulePersist,
  writeLastSyncedAt
} from './spreadsheetStorePersist'

export interface SheetStoreSnapshot {
  spreadsheetId: string
  sheets: Record<string, string[][]>
  lastSyncedAt: number | null
}

let memoryStore: SheetStoreSnapshot | null = null

const listeners = new Set<() => void>()

registerSnapshotProvider(() =>
  memoryStore ? { spreadsheetId: memoryStore.spreadsheetId, sheets: memoryStore.sheets } : null
)

function sheetRowsEqual(prev: string[][], next: string[][]): boolean {
  if (prev.length !== next.length) return false

  for (let rowIndex = 0; rowIndex < prev.length; rowIndex += 1) {
    const prevRow = prev[rowIndex]
    const nextRow = next[rowIndex]

    if (prevRow.length !== nextRow.length) return false

    for (let cellIndex = 0; cellIndex < prevRow.length; cellIndex += 1) {
      if (prevRow[cellIndex] !== nextRow[cellIndex]) return false
    }
  }

  return true
}

function notifyListeners(): void {
  for (const listener of listeners) {
    listener()
  }
}

function persistStore(store: SheetStoreSnapshot): void {
  memoryStore = store
  schedulePersist(store.spreadsheetId)
  notifyListeners()
}

export function subscribeStore(listener: () => void): () => void {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

export function getStore(spreadsheetId: string): SheetStoreSnapshot | null {
  return memoryStore?.spreadsheetId === spreadsheetId ? memoryStore : null
}

export function initStore(spreadsheetId: string): SheetStoreSnapshot {
  const existing = getStore(spreadsheetId)

  if (existing) return existing

  const fresh: SheetStoreSnapshot = {
    spreadsheetId,
    sheets: {},
    lastSyncedAt: readLastSyncedAt(spreadsheetId)
  }

  memoryStore = fresh

  return fresh
}

/**
 * Loads the cached mirror from IndexedDB into memory. Must be awaited before any
 * screen reads sheets, because every read path below is synchronous by design.
 */
export async function hydrateStore(spreadsheetId: string): Promise<SheetStoreSnapshot> {
  const persisted = await loadPersistedSnapshot(spreadsheetId)

  const store: SheetStoreSnapshot = {
    spreadsheetId,
    sheets: persisted?.sheets ?? {},
    lastSyncedAt: readLastSyncedAt(spreadsheetId)
  }

  memoryStore = store
  notifyListeners()

  return store
}

export function hasStoreData(spreadsheetId: string): boolean {
  const store = getStore(spreadsheetId)

  if (!store) return false

  return Object.keys(store.sheets).length > 0
}

export function getSheetAllRows(spreadsheetId: string, sheetName: string): string[][] | null {
  const rows = getStore(spreadsheetId)?.sheets[sheetName]

  if (!rows) return null

  return rows.map(row => [...row])
}

export function getSheetDataRows(spreadsheetId: string, sheetName: string): string[][] | null {
  const allRows = getStore(spreadsheetId)?.sheets[sheetName]

  if (!allRows) return null

  if (allRows.length <= 1) return []

  const dataRows: string[][] = new Array(allRows.length - 1)

  for (let rowIndex = 1; rowIndex < allRows.length; rowIndex += 1) {
    dataRows[rowIndex - 1] = [...allRows[rowIndex]]
  }

  return dataRows
}

export function setSheetAllRows(
  spreadsheetId: string,
  sheetName: string,
  allRows: string[][],
  options: { silent?: boolean } = {}
): void {
  const store = initStore(spreadsheetId)

  store.sheets[sheetName] = allRows.map(row => [...row])

  if (options.silent) {
    memoryStore = store
    schedulePersist(spreadsheetId)

    return
  }
  persistStore(store)
}

export function setManySheetAllRows(
  spreadsheetId: string,
  sheets: Map<string, string[][]>
): boolean {
  const store = initStore(spreadsheetId)

  let changed = false

  for (const [sheetName, allRows] of sheets) {
    const next = allRows.map(row => [...row])

    const prev = store.sheets[sheetName]

    if (!prev || !sheetRowsEqual(prev, next)) {
      store.sheets[sheetName] = next
      changed = true
    }
  }

  memoryStore = store

  if (changed) {
    schedulePersist(spreadsheetId)
  }

  return changed
}

export function appendSheetDataRow(spreadsheetId: string, sheetName: string, row: string[]): void {
  const store = initStore(spreadsheetId)

  const sheet = store.sheets[sheetName] ?? []

  store.sheets[sheetName] = [...sheet, [...row]]
  persistStore(store)
}

export function updateSheetDataRow(
  spreadsheetId: string,
  sheetName: string,
  rowNumber: number,
  row: string[]
): void {
  const store = initStore(spreadsheetId)

  const sheet = [...(store.sheets[sheetName] ?? [])]

  const index = rowNumber - 1

  if (index >= 0 && index < sheet.length) {
    sheet[index] = [...row]
    store.sheets[sheetName] = sheet
    persistStore(store)
  }
}

export function deleteSheetDataRow(
  spreadsheetId: string,
  sheetName: string,
  rowNumber: number
): void {
  const store = initStore(spreadsheetId)

  const sheet = [...(store.sheets[sheetName] ?? [])]

  const index = rowNumber - 1

  if (index >= 0 && index < sheet.length) {
    sheet.splice(index, 1)
    store.sheets[sheetName] = sheet
    persistStore(store)
  }
}

export function replaceSheetDataRows(
  spreadsheetId: string,
  sheetName: string,
  dataRows: string[][],
  headerRow?: string[]
): void {
  const store = initStore(spreadsheetId)

  const existingHeader = store.sheets[sheetName]?.[0]
  const hasExistingHeader = Boolean(existingHeader?.some(cell => String(cell ?? '').trim()))
  const header = hasExistingHeader ? existingHeader : headerRow

  store.sheets[sheetName] = header
    ? [header, ...dataRows.map(row => [...row])]
    : dataRows.map(row => [...row])
  persistStore(store)
}

export function setStoreLastSyncedAt(spreadsheetId: string, ts: number): void {
  const store = initStore(spreadsheetId)

  store.lastSyncedAt = ts
  writeLastSyncedAt(spreadsheetId, ts)
}

export function getStoreLastSyncedAt(spreadsheetId: string): number | null {
  return getStore(spreadsheetId)?.lastSyncedAt ?? readLastSyncedAt(spreadsheetId)
}

export function clearStore(spreadsheetId: string): void {
  cancelScheduledPersist()

  if (memoryStore?.spreadsheetId === spreadsheetId) {
    memoryStore = null
  }
  void deleteSnapshot(spreadsheetId)
  notifyListeners()
}
