import { getItem, removeItem, setItem } from './storage';

const OUTBOX_KEY_PREFIX = 'accounting_sync_outbox_';

export interface OutboxWriteOptions {
  skipActivity?: boolean;
  skipRevision?: boolean;
}

export type OutboxOperation =
  | {
      type: 'append';
      sheetName: string;
      row: string[];
      writeOptions?: OutboxWriteOptions;
    }
  | {
      type: 'update';
      sheetName: string;
      rowNumber: number;
      row: string[];
      writeOptions?: OutboxWriteOptions;
    }
  | {
      type: 'delete';
      sheetName: string;
      rowNumber: number;
    }
  | {
      type: 'replace';
      sheetName: string;
      rows: string[][];
      columnCount: number;
    };

export interface OutboxEntry {
  id: string;
  spreadsheetId: string;
  createdAt: number;
  operation: OutboxOperation;
  attempts: number;
  lastError?: string;
}

function outboxKey(spreadsheetId: string): string {
  return `${OUTBOX_KEY_PREFIX}${spreadsheetId}`;
}

function readOutbox(spreadsheetId: string): OutboxEntry[] {
  return getItem<OutboxEntry[]>(outboxKey(spreadsheetId)) ?? [];
}

function writeOutbox(spreadsheetId: string, entries: OutboxEntry[]): void {
  if (!entries.length) {
    removeItem(outboxKey(spreadsheetId));
    return;
  }
  setItem(outboxKey(spreadsheetId), entries);
}

export function getOutboxEntries(spreadsheetId: string): OutboxEntry[] {
  return readOutbox(spreadsheetId);
}

export function getOutboxCount(spreadsheetId: string): number {
  return readOutbox(spreadsheetId).length;
}

export function getOutboxSheetNames(spreadsheetId: string): Set<string> {
  const names = new Set<string>();
  for (const entry of readOutbox(spreadsheetId)) {
    names.add(entry.operation.sheetName);
  }
  return names;
}

export function hasPendingOutbox(spreadsheetId: string): boolean {
  return getOutboxCount(spreadsheetId) > 0;
}

export function addOutboxEntry(
  spreadsheetId: string,
  operation: OutboxOperation
): OutboxEntry {
  const entry: OutboxEntry = {
    id: crypto.randomUUID(),
    spreadsheetId,
    createdAt: Date.now(),
    operation,
    attempts: 0,
  };
  const next = [...readOutbox(spreadsheetId), entry];
  writeOutbox(spreadsheetId, next);
  return entry;
}

export function removeOutboxEntry(spreadsheetId: string, entryId: string): void {
  const next = readOutbox(spreadsheetId).filter((entry) => entry.id !== entryId);
  writeOutbox(spreadsheetId, next);
}

export function markOutboxEntryFailed(
  spreadsheetId: string,
  entryId: string,
  error: string
): void {
  const next = readOutbox(spreadsheetId).map((entry) =>
    entry.id === entryId
      ? { ...entry, attempts: entry.attempts + 1, lastError: error }
      : entry
  );
  writeOutbox(spreadsheetId, next);
}

export function clearOutbox(spreadsheetId: string): void {
  removeItem(outboxKey(spreadsheetId));
}
