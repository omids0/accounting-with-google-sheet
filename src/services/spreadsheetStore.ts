import { getItem, removeItem, setItem } from './storage';

const STORE_KEY_PREFIX = 'accounting_sheet_store_';

export interface SheetStoreSnapshot {
  spreadsheetId: string;
  sheets: Record<string, string[][]>;
  lastSyncedAt: number | null;
}

let memoryStore: SheetStoreSnapshot | null = null;
const listeners = new Set<() => void>();

function storageKey(spreadsheetId: string): string {
  return `${STORE_KEY_PREFIX}${spreadsheetId}`;
}

function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

function persistStore(store: SheetStoreSnapshot): void {
  memoryStore = store;
  setItem(storageKey(store.spreadsheetId), store);
  notifyListeners();
}

export function subscribeStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getStore(spreadsheetId: string): SheetStoreSnapshot | null {
  if (memoryStore?.spreadsheetId === spreadsheetId) {
    return memoryStore;
  }

  const stored = getItem<SheetStoreSnapshot>(storageKey(spreadsheetId));
  if (stored?.spreadsheetId === spreadsheetId) {
    memoryStore = stored;
    return stored;
  }

  return null;
}

export function initStore(spreadsheetId: string): SheetStoreSnapshot {
  const existing = getStore(spreadsheetId);
  if (existing) return existing;

  const fresh: SheetStoreSnapshot = {
    spreadsheetId,
    sheets: {},
    lastSyncedAt: null,
  };
  persistStore(fresh);
  return fresh;
}

export function hasStoreData(spreadsheetId: string): boolean {
  const store = getStore(spreadsheetId);
  if (!store) return false;
  return Object.keys(store.sheets).length > 0;
}

export function getSheetAllRows(
  spreadsheetId: string,
  sheetName: string
): string[][] | null {
  const store = getStore(spreadsheetId);
  if (!store?.sheets[sheetName]) return null;
  return store.sheets[sheetName].map((row) => [...row]);
}

export function getSheetDataRows(
  spreadsheetId: string,
  sheetName: string
): string[][] | null {
  const allRows = getSheetAllRows(spreadsheetId, sheetName);
  if (!allRows) return null;
  return allRows.length <= 1 ? [] : allRows.slice(1).map((row) => [...row]);
}

export function setSheetAllRows(
  spreadsheetId: string,
  sheetName: string,
  allRows: string[][],
  options: { silent?: boolean } = {}
): void {
  const store = initStore(spreadsheetId);
  store.sheets[sheetName] = allRows.map((row) => [...row]);
  if (options.silent) {
    memoryStore = store;
    setItem(storageKey(store.spreadsheetId), store);
    return;
  }
  persistStore(store);
}

export function setManySheetAllRows(
  spreadsheetId: string,
  sheets: Map<string, string[][]>
): boolean {
  const store = initStore(spreadsheetId);
  let changed = false;

  for (const [sheetName, allRows] of sheets) {
    const next = allRows.map((row) => [...row]);
    const prev = store.sheets[sheetName];
    if (!prev || JSON.stringify(prev) !== JSON.stringify(next)) {
      store.sheets[sheetName] = next;
      changed = true;
    }
  }

  memoryStore = store;
  setItem(storageKey(store.spreadsheetId), store);
  return changed;
}

export function appendSheetDataRow(
  spreadsheetId: string,
  sheetName: string,
  row: string[]
): void {
  const store = initStore(spreadsheetId);
  const sheet = store.sheets[sheetName] ?? [];
  store.sheets[sheetName] = [...sheet, [...row]];
  persistStore(store);
}

export function updateSheetDataRow(
  spreadsheetId: string,
  sheetName: string,
  rowNumber: number,
  row: string[]
): void {
  const store = initStore(spreadsheetId);
  const sheet = [...(store.sheets[sheetName] ?? [])];
  const index = rowNumber - 1;
  if (index >= 0 && index < sheet.length) {
    sheet[index] = [...row];
    store.sheets[sheetName] = sheet;
    persistStore(store);
  }
}

export function deleteSheetDataRow(
  spreadsheetId: string,
  sheetName: string,
  rowNumber: number
): void {
  const store = initStore(spreadsheetId);
  const sheet = [...(store.sheets[sheetName] ?? [])];
  const index = rowNumber - 1;
  if (index >= 0 && index < sheet.length) {
    sheet.splice(index, 1);
    store.sheets[sheetName] = sheet;
    persistStore(store);
  }
}

export function replaceSheetDataRows(
  spreadsheetId: string,
  sheetName: string,
  dataRows: string[][]
): void {
  const store = initStore(spreadsheetId);
  const header = store.sheets[sheetName]?.[0];
  store.sheets[sheetName] = header
    ? [header, ...dataRows.map((row) => [...row])]
    : dataRows.map((row) => [...row]);
  persistStore(store);
}

export function setStoreLastSyncedAt(spreadsheetId: string, ts: number): void {
  const store = initStore(spreadsheetId);
  store.lastSyncedAt = ts;
  persistStore(store);
}

export function getStoreLastSyncedAt(spreadsheetId: string): number | null {
  return getStore(spreadsheetId)?.lastSyncedAt ?? null;
}

export function clearStore(spreadsheetId: string): void {
  if (memoryStore?.spreadsheetId === spreadsheetId) {
    memoryStore = null;
  }
  removeItem(storageKey(spreadsheetId));
  notifyListeners();
}
